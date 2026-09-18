import {
  findInteractionScoresArtifact,
  interactionScreeningBoltzAdapter,
  interactionScreeningColabFoldAdapter,
} from "./interaction-screening-results.utils";
import { getJobResultsAdapter } from "./job-results-report.utils";
import { ResultFileRef } from "./prediction-results.utils";

const RUN = "run-1";

function file(key: string, category = "pdb"): ResultFileRef {
  return {
    key,
    label: key.split("/").pop() ?? key,
    url: `https://s3.test/${key}`,
    category,
  };
}

const scoresFile = file(
  `${RUN}/collect/boltz_confidence_scores_full.csv`,
  "stats_csv"
);

/** One published complex, as Boltz names it. */
function cif(id: string): ResultFileRef {
  return file(`${RUN}/boltz_predictions/cif/${id}_model_0.cif`);
}

/** One published complex, as ColabFold names it. */
function pdb(id: string, rank = "001"): ResultFileRef {
  return file(
    `${RUN}/colabfold_predictions/pdb/${id}_unrelaxed_rank_${rank}_alphafold2_multimer_v3_model_3_seed_000.pdb`
  );
}

/** One published complex, as Boltz names it, for a model other than its best. */
function cifModel(id: string, model: number): ResultFileRef {
  return file(`${RUN}/boltz_predictions/cif/${id}_model_${model}.cif`);
}

/** A collected scores table, in the column order the pipeline writes. */
function scoresCsv(rows: Array<[string, string, string]>): string {
  return [
    "id,model_input_id,iptm,ptm,int_chain_map,str_chain_map",
    ...rows.map(([id, iptm, ptm]) => `${id},${id},${iptm},${ptm},0:1,A:B`),
  ].join("\n");
}

describe("interaction screening results utils", () => {
  it("registers both tools under the interaction screening workflow", () => {
    expect(getJobResultsAdapter("interaction screening", "boltz")).toBe(
      interactionScreeningBoltzAdapter
    );
    expect(getJobResultsAdapter("Interaction Screening", "ColabFold")).toBe(
      interactionScreeningColabFoldAdapter
    );
  });

  it("does not answer for de novo design, which has its own adapters", () => {
    expect(getJobResultsAdapter("de novo design", "boltz")).toBeNull();
  });

  describe("finding the scores table", () => {
    it("finds the collected table whichever tool wrote it", () => {
      expect(findInteractionScoresArtifact([scoresFile])).toBe(scoresFile);

      const colabfold = file(
        `${RUN}/collect/colabfold_confidence_scores_full.csv`,
        "stats_csv"
      );
      expect(findInteractionScoresArtifact([colabfold])).toBe(colabfold);
    });

    it("ignores a look-alike outside the collect folder", () => {
      const stray = file(
        `${RUN}/run/boltz_confidence_scores_full.csv`,
        "stats_csv"
      );
      expect(findInteractionScoresArtifact([stray])).toBeNull();
      expect(findInteractionScoresArtifact([])).toBeNull();
    });
  });

  describe("building rows", () => {
    const parse = (
      text: string,
      files: readonly ResultFileRef[],
      ipsaeText: string | null = null
    ) => interactionScreeningBoltzAdapter.parseRows(text, files, ipsaeText);

    it("splits the pair id into its query and target", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);
      const rows = parse(text, [scoresFile, cif("seq1-seq3")]);

      expect(rows.length).toBe(1);
      expect(rows[0].values["queryId"]).toBe("seq1");
      expect(rows[0].values["targetId"]).toBe("seq3");
      expect(rows[0].values["iptm"]).toBe("0.58");
      expect(rows[0].values["ptm"]).toBe("0.68");
    });

    it("pairs each row with the complex written for it", () => {
      const text = scoresCsv([
        ["seq1-seq3", "0.58", "0.68"],
        ["seq1-seq4", "0.11", "0.42"],
      ]);
      const rows = parse(text, [
        scoresFile,
        cif("seq1-seq4"),
        cif("seq1-seq3"),
      ]);

      expect(rows.map((row) => row.structure?.key)).toEqual([
        `${RUN}/boltz_predictions/cif/seq1-seq3_model_0.cif`,
        `${RUN}/boltz_predictions/cif/seq1-seq4_model_0.cif`,
      ]);
      expect(rows[0].structure?.format).toBe("mmcif");
    });

    it("drops the pairs the score filter kept out of the outputs", () => {
      const text = scoresCsv([
        ["seq1-seq3", "0.58", "0.68"],
        ["seq1-seq4", "0.11", "0.42"],
      ]);
      const rows = parse(text, [scoresFile, cif("seq1-seq3")]);

      expect(rows.map((row) => row.id)).toEqual(["seq1-seq3"]);
    });

    it("yields no rows when the filter kept nothing, rather than throwing", () => {
      const text = scoresCsv([["seq1-seq3", "0.05", "0.11"]]);

      expect(parse(text, [scoresFile])).toEqual([]);
      expect(parse("", [scoresFile])).toEqual([]);
      expect(parse("id,iptm,ptm\n", [scoresFile])).toEqual([]);
    });

    it("keeps the pair whole when headers hold hyphens of their own", () => {
      // anne-1/anne-2 against anne-3/anne-4 is one valid reading, but so is
      // anne-1-anne/anne-2-anne against 3/4. The ids cannot say which.
      const ids = [
        "anne-1-anne-3",
        "anne-1-anne-4",
        "anne-2-anne-3",
        "anne-2-anne-4",
      ];
      const text = scoresCsv(ids.map((id) => [id, "0.35", "0.39"]));
      const rows = interactionScreeningColabFoldAdapter.parseRows(text, [
        scoresFile,
        ...ids.map((id) => pdb(id)),
      ]);

      expect(
        rows.map((row) => [row.values["queryId"], row.values["targetId"]])
      ).toEqual([
        ["anne-1-anne-3", ""],
        ["anne-1-anne-4", ""],
        ["anne-2-anne-3", ""],
        ["anne-2-anne-4", ""],
      ]);
      expect(rows[0].structure?.format).toBe("pdb");
    });

    it("does not guess a split for one hyphenated query against many targets", () => {
      // anne-1 against t1/t2 reads equally as anne against 1-t1/1-t2, and both
      // have a single query, so no tie-break can prefer one.
      const ids = ["anne-1-t1", "anne-1-t2"];
      const text = scoresCsv(ids.map((id) => [id, "0.35", "0.39"]));
      const rows = parse(text, [scoresFile, ...ids.map(cif)]);

      expect(
        rows.map((row) => [row.values["queryId"], row.values["targetId"]])
      ).toEqual([
        ["anne-1-t1", ""],
        ["anne-1-t2", ""],
      ]);
    });

    it("still splits a run the filter cut down to one pair", () => {
      const text = scoresCsv([
        ["seq1-seq3", "0.58", "0.68"],
        ["seq1-seq4", "0.11", "0.42"],
      ]);
      const rows = parse(text, [scoresFile, cif("seq1-seq4")]);

      // The grid comes from the whole table, not just the surviving row.
      expect(rows[0].values["queryId"]).toBe("seq1");
      expect(rows[0].values["targetId"]).toBe("seq4");
    });

    it("joins ipSAE from the pipeline's per-pair file", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);
      const ipsae = ["Sample,boltz", "seq1-seq3,0.296765"].join("\n");
      const rows = parse(text, [scoresFile, cif("seq1-seq3")], ipsae);

      expect(rows[0].values["ipsae"]).toBe("0.296765");
    });

    it("leaves ipSAE blank when the run published no scores for it", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);

      expect(
        parse(text, [scoresFile, cif("seq1-seq3")])[0].values["ipsae"]
      ).toBe("");
      expect(
        parse(
          text,
          [scoresFile, cif("seq1-seq3")],
          "Sample,boltz\nother,0.5"
        )[0].values["ipsae"]
      ).toBe("");
    });

    it("prefers the scores table's own ipSAE column once it is there", () => {
      const text = [
        "id,model_input_id,ipSAE,iptm,ptm",
        "seq1-seq3,seq1-seq3,0.32,0.58,0.68",
      ].join("\n");
      const ipsae = ["Sample,boltz", "seq1-seq3,0.99"].join("\n");

      expect(
        parse(text, [scoresFile, cif("seq1-seq3")])[0].values["ipsae"]
      ).toBe("0.32");
      expect(
        parse(text, [scoresFile, cif("seq1-seq3")], ipsae)[0].values["ipsae"]
      ).toBe("0.32");
    });

    it("keeps the top-ranked model when a pair has several", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);

      // Worst model listed last, so a last-one-wins map would pick it.
      const boltz = parse(text, [
        scoresFile,
        cifModel("seq1-seq3", 0),
        cifModel("seq1-seq3", 4),
      ]);
      expect(boltz[0].structure?.key).toContain("seq1-seq3_model_0.cif");

      const colabfold = interactionScreeningColabFoldAdapter.parseRows(
        text,
        [scoresFile, pdb("seq1-seq3", "001"), pdb("seq1-seq3", "005")],
        null
      );
      expect(colabfold[0].structure?.key).toContain("rank_001");
    });

    it("keeps a pair id apart from a longer one sharing its prefix", () => {
      const text = scoresCsv([
        ["seq1-t1", "0.58", "0.68"],
        ["seq1-t10", "0.11", "0.42"],
        ["seq2-t1", "0.20", "0.30"],
        ["seq2-t10", "0.25", "0.35"],
      ]);
      const rows = parse(text, [scoresFile, cif("seq1-t1"), cif("seq1-t10")]);

      expect(
        rows.map((row) => [row.id, row.structure?.key.split("/").pop()])
      ).toEqual([
        ["seq1-t1", "seq1-t1_model_0.cif"],
        ["seq1-t10", "seq1-t10_model_0.cif"],
      ]);
    });

    it("ignores a stray file in the prediction folder", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);
      const stray = file(`${RUN}/boltz_predictions/cif/seq1-seq3.cif`);

      expect(parse(text, [scoresFile, stray])).toEqual([]);
    });

    it("yields no rows when the table has no id column", () => {
      const text = ["model_input_id,iptm,ptm", "seq1-seq3,0.58,0.68"].join(
        "\n"
      );

      expect(parse(text, [scoresFile, cif("seq1-seq3")])).toEqual([]);
    });

    it("ignores the other tool's prediction folder", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);

      expect(parse(text, [scoresFile, pdb("seq1-seq3")])).toEqual([]);
    });
  });

  describe("ids the grid cannot explain", () => {
    const parse = (text: string, files: readonly ResultFileRef[]) =>
      interactionScreeningBoltzAdapter.parseRows(text, files);

    /** Splits the ids of a run whose every pair was published. */
    const splitOf = (ids: readonly string[]) => {
      const text = scoresCsv(ids.map((id) => [id, "0.5", "0.6"]));
      return parse(text, [scoresFile, ...ids.map(cif)]).map((row) => [
        row.values["queryId"],
        row.values["targetId"],
      ]);
    };

    it("falls back to the first hyphen when the pairs are not a full grid", () => {
      // 3 pairs cannot be a query set times a target set.
      expect(splitOf(["seq1-t1", "seq1-t2", "seq2-t1"])).toEqual([
        ["seq1", "t1"],
        ["seq1", "t2"],
        ["seq2", "t1"],
      ]);
    });

    it("rejects a split that is the right size but misses a pair", () => {
      // 2x2 by count, but b-y is absent and c-y is not in the grid.
      expect(splitOf(["a-x", "a-y", "b-x", "c-y"])).toEqual([
        ["a", "x"],
        ["a", "y"],
        ["b", "x"],
        ["c", "y"],
      ]);
    });

    it("keeps an unpaired id whole, rather than inventing a target", () => {
      // A bulk prediction table would look like this; it belongs to another
      // adapter, but reaching this one must not throw.
      expect(splitOf(["seq1"])).toEqual([["seq1", ""]]);
    });

    it("handles a header that starts with a hyphen", () => {
      expect(splitOf(["-seq3"])).toEqual([["", "seq3"]]);
    });
  });

  describe("the report it configures", () => {
    it("colours chain A as the query and names both bands", () => {
      expect(interactionScreeningBoltzAdapter.primaryChainId).toBe("A");
      expect(interactionScreeningBoltzAdapter.legend).toEqual([
        { label: "Query", band: "primary" },
        { label: "Target", band: "secondary" },
      ]);
    });

    it("does not superpose, since each row is a different pair", () => {
      expect(interactionScreeningBoltzAdapter.superpose).toBeFalse();
    });

    it("says so when nothing passed the score filter", () => {
      expect(interactionScreeningBoltzAdapter.emptyMessage).toBe(
        "No high confidence interactions were identified."
      );
    });

    it("shows the five columns the report is specified to carry", () => {
      expect(
        interactionScreeningBoltzAdapter.columns.map((column) => column.heading)
      ).toEqual(["Query ID", "Target ID", "ipSAE", "ipTM", "pTM"]);
    });
  });
});
