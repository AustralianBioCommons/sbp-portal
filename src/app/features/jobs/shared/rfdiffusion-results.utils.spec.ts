import {
  RFDIFFUSION_AF2_COLUMNS,
  RFDIFFUSION_BOLTZ_COLUMNS,
  findRfDiffusionColumns,
  findRfDiffusionResultsArtifact,
  findRfDiffusionStructureArchive,
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
const archiveFile = file("run-1/results/ranked_designs.tar.gz");

describe("rfdiffusion results utils", () => {
  it("registers itself under the tool id the job reports", () => {
    expect(getDeNovoDesignAdapter("rfdiffusion")).toBe(rfDiffusionAdapter);
    expect(getDeNovoDesignAdapter("RFdiffusion")).toBe(rfDiffusionAdapter);
  });

  describe("finding artifacts", () => {
    it("finds the ranked CSV and the structure tarball", () => {
      const files = [resultsFile, archiveFile, file("run-1/results/other.csv")];
      expect(findRfDiffusionResultsArtifact(files)).toBe(resultsFile);
      expect(findRfDiffusionStructureArchive(files)).toBe(archiveFile);
    });

    it("returns null when the run published neither", () => {
      const files = [file("run-1/results/all_designs.csv")];
      expect(findRfDiffusionResultsArtifact(files)).toBeNull();
      expect(findRfDiffusionStructureArchive(files)).toBeNull();
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

  describe("pairing designs with archive members", () => {
    const csv = [
      "rank,fold_id,seq_id,description,sequence,seq_length,af2_plddt_overall",
      "1,3,0,fold_3_seq_0_af2pred,MKTAY,5,91.3",
      "2,0,1,fold_0_seq_1_af2pred,MKTAW,5,88.1",
    ].join("\n");

    const entries = [
      "ranked_designs/1_fold_3_seq_0_af2pred.pdb",
      "ranked_designs/2_fold_0_seq_1_af2pred.pdb",
    ];

    it("points each row at its member of the tarball, not a key of its own", () => {
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(csv).rows,
        archiveFile,
        entries
      );

      expect(rows.length).toBe(2);
      expect(rows[0].structure).toEqual({
        // The archive is the object; the design is a member inside it.
        key: archiveFile.key,
        label: "1_fold_3_seq_0_af2pred.pdb",
        format: "pdb",
        entry: "ranked_designs/1_fold_3_seq_0_af2pred.pdb",
      });
      expect(rows[1].structure?.entry).toBe(
        "ranked_designs/2_fold_0_seq_1_af2pred.pdb"
      );
    });

    it("matches on fold and sequence id, not on the rank prefix", () => {
      // Ranks here disagree with the prefixes, so only fold/seq can pair them.
      const shuffled = [
        "ranked_designs/07_fold_0_seq_1_af2pred.pdb",
        "ranked_designs/09_fold_3_seq_0_af2pred.pdb",
      ];
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(csv).rows,
        archiveFile,
        shuffled
      );

      expect(rows[0].structure?.entry).toBe(
        "ranked_designs/09_fold_3_seq_0_af2pred.pdb"
      );
      expect(rows[1].structure?.entry).toBe(
        "ranked_designs/07_fold_0_seq_1_af2pred.pdb"
      );
    });

    it("pairs Boltz-predicted members too", () => {
      const boltz = ["ranked_designs/1_fold_3_seq_0_boltzpred.pdb"];
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(csv).rows,
        archiveFile,
        boltz
      );
      expect(rows[0].structure?.entry).toBe(boltz[0]);
    });

    it("tolerates ids the CSV wrote as floats", () => {
      const floats = [
        "rank,fold_id,seq_id,description",
        "1,3.0,0.0,fold_3_seq_0_af2pred",
      ].join("\n");
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(floats).rows,
        archiveFile,
        entries
      );
      expect(rows[0].structure?.entry).toBe(
        "ranked_designs/1_fold_3_seq_0_af2pred.pdb"
      );
    });

    it("falls back to rank, zero padding and all, when the CSV has no ids", () => {
      const noIds = ["rank,description", "2,second"].join("\n");
      // Padded to the design count's width, so rank compares as a number.
      const padded = [
        "ranked_designs/001_fold_3_seq_0_af2pred.pdb",
        "ranked_designs/002_fold_0_seq_1_af2pred.pdb",
      ];
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(noIds).rows,
        archiveFile,
        padded
      );
      expect(rows[0].structure?.entry).toBe(
        "ranked_designs/002_fold_0_seq_1_af2pred.pdb"
      );
    });

    it("leaves a row without a structure when no member matches", () => {
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(csv).rows,
        archiveFile,
        ["ranked_designs/1_fold_9_seq_9_af2pred.pdb"]
      );
      // Rank 2 has no member of its own, and rank 1 is claimed by fold/seq.
      expect(rows[1].structure).toBeNull();
    });

    it("still lists the designs when the archive is missing entirely", () => {
      const rows = parseRfDiffusionDesigns(parseCsvTable(csv).rows, null, []);
      expect(rows.length).toBe(2);
      expect(rows[0].structure).toBeNull();
      expect(rows[0].values["af2_plddt_overall"]).toBe("91.3");
    });

    it("keeps row ids unique when rank and description repeat", () => {
      const duplicates = ["rank,description", "1,same", "1,same"].join("\n");
      const rows = parseRfDiffusionDesigns(
        parseCsvTable(duplicates).rows,
        null,
        []
      );
      expect(rows[0].id).not.toBe(rows[1].id);
    });
  });
});
