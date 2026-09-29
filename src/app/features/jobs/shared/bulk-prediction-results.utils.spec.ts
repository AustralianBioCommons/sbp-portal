import {
  bulkPredictionBoltzAdapter,
  bulkPredictionColabFoldAdapter,
  derivePlddt,
} from "./bulk-prediction-results.utils";
import {
  NO_PREDICTIONS_MESSAGE,
  getJobResultsAdapter,
} from "./job-results-report.utils";
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

/** One published structure, as Boltz names it. */
function cif(id: string): ResultFileRef {
  return file(`${RUN}/boltz_predictions/cif/${id}_model_0.cif`);
}

/** One published structure, as ColabFold names it. */
function pdb(id: string): ResultFileRef {
  return file(
    `${RUN}/colabfold_predictions/pdb/${id}_unrelaxed_rank_001_alphafold2_ptm_model_3_seed_000.pdb`
  );
}

/** A collected scores table, in the column order the pipeline writes. */
function scoresCsv(rows: Array<[string, string]>): string {
  return [
    "id,model_input_id,iptm,ptm,int_chain_map,str_chain_map",
    ...rows.map(([id, ptm]) => `${id},${id},,${ptm},0:1,A:B`),
  ].join("\n");
}

describe("bulk prediction results utils", () => {
  const parse = (text: string, files: readonly ResultFileRef[]) =>
    bulkPredictionBoltzAdapter.parseRows(text, files);

  it("registers both tools under the bulk prediction workflow", () => {
    expect(getJobResultsAdapter("bulk prediction", "boltz")).toBe(
      bulkPredictionBoltzAdapter
    );
    expect(getJobResultsAdapter("Bulk Prediction", "ColabFold")).toBe(
      bulkPredictionColabFoldAdapter
    );
  });

  describe("building rows", () => {
    it("keeps the submitted header whole, hyphens and all", () => {
      const text = scoresCsv([["my-long-name", "0.42"]]);
      const rows = parse(text, [scoresFile, cif("my-long-name")]);

      expect(rows.length).toBe(1);
      expect(rows[0].values["id"]).toBe("my-long-name");
      expect(rows[0].values["ptm"]).toBe("0.42");
    });

    it("puts Boltz's 0-1 pLDDT on the 0-100 scale", () => {
      const text = [
        "id,model_input_id,ptm,complex_plddt",
        "seq1,seq1,0.55,0.5428716540336609",
      ].join("\n");
      const rows = parse(text, [scoresFile, cif("seq1")]);

      expect(Number(rows[0].values["plddt"])).toBeCloseTo(54.287, 3);
    });

    it("pairs each row with the structure written for it", () => {
      const text = scoresCsv([
        ["seq1", "0.68"],
        ["seq2", "0.42"],
      ]);
      const rows = parse(text, [scoresFile, cif("seq2"), cif("seq1")]);

      expect(rows.map((row) => row.structure?.key)).toEqual([
        `${RUN}/boltz_predictions/cif/seq1_model_0.cif`,
        `${RUN}/boltz_predictions/cif/seq2_model_0.cif`,
      ]);
      expect(rows[0].structure?.format).toBe("mmcif");
    });

    it("drops the sequences the score filter kept out of the outputs", () => {
      const text = scoresCsv([
        ["seq1", "0.68"],
        ["seq2", "0.11"],
      ]);

      expect(
        parse(text, [scoresFile, cif("seq1")]).map((row) => row.id)
      ).toEqual(["seq1"]);
    });

    it("yields no rows when the filter kept nothing, rather than throwing", () => {
      expect(parse(scoresCsv([["seq1", "0.11"]]), [scoresFile])).toEqual([]);
      expect(parse("", [scoresFile])).toEqual([]);
      expect(parse("id,iptm,ptm\n", [scoresFile])).toEqual([]);
    });

    it("reads ColabFold's own filenames", () => {
      const text = scoresCsv([["seq1", "0.68"]]);
      const rows = bulkPredictionColabFoldAdapter.parseRows(text, [
        scoresFile,
        pdb("seq1"),
      ]);

      expect(rows[0].structure?.format).toBe("pdb");
    });
  });

  describe("deriving pLDDT", () => {
    it("takes ColabFold's own 0-100 value as it is", () => {
      expect(derivePlddt({ plddt: "68.312" })).toBe("68.312");
    });

    it("scales Boltz's 0-1 value up to 0-100", () => {
      expect(Number(derivePlddt({ complex_plddt: "0.5" }))).toBe(50);
    });

    it("prefers ColabFold's column if a table somehow carries both", () => {
      expect(derivePlddt({ plddt: "68.312", complex_plddt: "0.5" })).toBe(
        "68.312"
      );
    });

    it("leaves the cell blank when neither tool reported one", () => {
      expect(derivePlddt({})).toBe("");
      expect(derivePlddt({ complex_plddt: "NA" })).toBe("");
      expect(derivePlddt({ plddt: " ", complex_plddt: "" })).toBe("");
    });
  });

  describe("the report it configures", () => {
    it("shows the query, pTM and pLDDT", () => {
      expect(bulkPredictionBoltzAdapter.columns.map((c) => c.heading)).toEqual([
        "Query ID",
        "pTM",
        "pLDDT",
      ]);
    });

    it("colours by pLDDT, so it carries no chain key of its own", () => {
      expect(bulkPredictionBoltzAdapter.colorTheme).toBe("plddt");
      expect(bulkPredictionBoltzAdapter.legend).toEqual([]);
    });

    it("says nothing passed when the run published no structures", () => {
      expect(bulkPredictionBoltzAdapter.emptyMessage).toBe(
        NO_PREDICTIONS_MESSAGE
      );
    });
  });
});
