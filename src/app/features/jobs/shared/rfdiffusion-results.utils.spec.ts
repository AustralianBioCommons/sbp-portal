import {
  RFDIFFUSION_AF2_COLUMNS,
  RFDIFFUSION_BOLTZ_COLUMNS,
  findRfDiffusionColumns,
  findRfDiffusionResultsArtifact,
  parseRfDiffusionDesigns,
  rfDiffusionAdapter,
} from "./rfdiffusion-results.utils";
import { getDeNovoDesignAdapter, parseCsvTable } from "./de-novo-results.utils";
import { ResultFileRef } from "./prediction-results.utils";

function file(key: string, category = "pdb"): ResultFileRef {
  return {
    key,
    label: key.split("/").pop() ?? key,
    url: `https://s3.test/${key}`,
    category,
  };
}

const resultsFile = file("run-1/results/ranked_designs.csv", "stats_csv");
/** One published design, as the pipeline names it. */
function design(name: string): ResultFileRef {
  return file(`run-1/results/ranked_designs/${name}`);
}

describe("rfdiffusion results utils", () => {
  it("registers itself under the tool id the job reports", () => {
    expect(getDeNovoDesignAdapter("rfdiffusion")).toBe(rfDiffusionAdapter);
    expect(getDeNovoDesignAdapter("RFdiffusion")).toBe(rfDiffusionAdapter);
  });

  describe("finding artifacts", () => {
    it("finds the ranked CSV", () => {
      const files = [resultsFile, file("run-1/results/other.csv")];
      expect(findRfDiffusionResultsArtifact(files)).toBe(resultsFile);
    });

    it("returns null when the run published none", () => {
      expect(
        findRfDiffusionResultsArtifact([file("run-1/results/all_designs.csv")])
      ).toBeNull();
    });
  });

  describe("choosing columns for the run's predictor", () => {
    it("uses the AF2 columns for an AF2 run", () => {
      expect(findRfDiffusionColumns(["rank", "af2_plddt_overall"])).toBe(
        RFDIFFUSION_AF2_COLUMNS
      );
    });

    it("uses the Boltz columns for a Boltz run", () => {
      expect(findRfDiffusionColumns(["rank", "boltz_plddt"])).toBe(
        RFDIFFUSION_BOLTZ_COLUMNS
      );
    });

    it("keeps the AF2 columns when a run carries both metric families", () => {
      // pred_method = 'af2_boltz' scores designs twice.
      expect(
        findRfDiffusionColumns(["rank", "af2_plddt_overall", "boltz_plddt"])
      ).toBe(RFDIFFUSION_AF2_COLUMNS);
    });
  });

  describe("pairing designs with their published files", () => {
    const csv = [
      "rank,fold_id,seq_id,description,sequence,seq_length,af2_plddt_overall",
      "1,3,0,fold_3_seq_0_af2pred,MKTAY,5,91.3",
      "2,0,1,fold_0_seq_1_af2pred,MKTAW,5,88.1",
    ].join("\n");

    const designs = [
      design("1_fold_3_seq_0_af2pred.pdb"),
      design("2_fold_0_seq_1_af2pred.pdb"),
    ];

    it("points each row at its own published file", () => {
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, designs);

      expect(rows.length).toBe(2);
      expect(rows[0].structure).toEqual({
        key: designs[0].key,
        label: designs[0].label,
        format: "pdb",
      });
      expect(rows[1].structure?.key).toBe(designs[1].key);
    });

    it("matches on fold and sequence id, not on the rank prefix", () => {
      // Ranks here disagree with the prefixes, so only fold/seq can pair them.
      const shuffled = [
        design("07_fold_0_seq_1_af2pred.pdb"),
        design("09_fold_3_seq_0_af2pred.pdb"),
      ];
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, shuffled);

      expect(rows[0].structure?.key).toBe(shuffled[1].key);
      expect(rows[1].structure?.key).toBe(shuffled[0].key);
    });

    it("pairs Boltz-predicted designs too", () => {
      const boltz = [design("1_fold_3_seq_0_boltzpred.pdb")];
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, boltz);

      expect(rows[0].structure?.key).toBe(boltz[0].key);
    });

    it("tolerates ids the CSV wrote as floats", () => {
      const floats = [
        "rank,fold_id,seq_id,description",
        "1,3.0,0.0,fold_3_seq_0_af2pred",
      ].join("\n");
      const rows = parseRfDiffusionDesigns(parseCsvTable(floats).rows, designs);

      expect(rows[0].structure?.key).toBe(designs[0].key);
    });

    it("falls back to rank, zero padding and all, when the CSV has no ids", () => {
      const noIds = ["rank,description", "2,second"].join("\n");
      // Padded to the design count's width, so rank compares as a number.
      const padded = [
        design("001_fold_3_seq_0_af2pred.pdb"),
        design("002_fold_0_seq_1_af2pred.pdb"),
      ];
      const rows = parseRfDiffusionDesigns(parseCsvTable(noIds).rows, padded);

      expect(rows[0].structure?.key).toBe(padded[1].key);
    });

    it("ignores a PDB published outside the ranked designs directory", () => {
      const elsewhere = [file("run-1/results/1_fold_3_seq_0_af2pred.pdb")];
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, elsewhere);

      expect(rows[0].structure).toBeNull();
    });

    it("leaves a row without a structure when no file matches", () => {
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, [
        design("1_fold_9_seq_9_af2pred.pdb"),
      ]);

      // Rank 2 has no file of its own, and rank 1 is claimed by fold/seq.
      expect(rows[1].structure).toBeNull();
    });

    it("still lists the designs when nothing was published", () => {
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, []);

      expect(rows.length).toBe(2);
      expect(rows[0].structure).toBeNull();
      expect(rows[0].values["af2_plddt_overall"]).toBe("91.3");
    });

    it("keeps row ids unique when rank and description repeat", () => {
      const duplicates = ["rank,description", "1,same", "1,same"].join("\n");
      const rows = parseRfDiffusionDesigns(parseCsvTable(duplicates).rows, []);

      expect(rows[0].id).not.toBe(rows[1].id);
    });
  });
});
