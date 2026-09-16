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
function pdb(id: string): ResultFileRef {
  return file(
    `${RUN}/colabfold_predictions/pdb/${id}_unrelaxed_rank_001_alphafold2_multimer_v3_model_3_seed_000.pdb`
  );
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
    const parse = (text: string, files: readonly ResultFileRef[]) =>
      interactionScreeningBoltzAdapter.parseRows(text, files);

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

    it("splits headers that hold hyphens of their own", () => {
      // A full grid of anne-1/anne-2 against anne-3/anne-4: the split has to
      // come from the grid, since every id has three hyphens to choose from.
      const ids = [
        "anne-1-anne-3",
        "anne-1-anne-4",
        "anne-2-anne-3",
        "anne-2-anne-4",
      ];
      const text = scoresCsv(ids.map((id) => [id, "0.35", "0.39"]));
      const rows = interactionScreeningColabFoldAdapter.parseRows(text, [
        scoresFile,
        ...ids.map(pdb),
      ]);

      expect(
        rows.map((row) => [row.values["queryId"], row.values["targetId"]])
      ).toEqual([
        ["anne-1", "anne-3"],
        ["anne-1", "anne-4"],
        ["anne-2", "anne-3"],
        ["anne-2", "anne-4"],
      ]);
      expect(rows[0].structure?.format).toBe("pdb");
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

    it("leaves ipSAE blank until the scores table carries it", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);
      const rows = parse(text, [scoresFile, cif("seq1-seq3")]);

      expect(rows[0].values["ipsae"]).toBe("");
    });

    it("reads ipSAE from the scores table once it is there", () => {
      const text = [
        "id,model_input_id,ipSAE,iptm,ptm",
        "seq1-seq3,seq1-seq3,0.32,0.58,0.68",
      ].join("\n");
      const rows = parse(text, [scoresFile, cif("seq1-seq3")]);

      expect(rows[0].values["ipsae"]).toBe("0.32");
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

    it("ignores the other tool's prediction folder", () => {
      const text = scoresCsv([["seq1-seq3", "0.58", "0.68"]]);

      expect(parse(text, [scoresFile, pdb("seq1-seq3")])).toEqual([]);
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
