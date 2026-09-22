import {
  BOLTZ_LAYOUT,
  COLABFOLD_LAYOUT,
  findWispsScoresArtifact,
  findWispsStructures,
} from "./wisps-results.utils";
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

describe("wisps results utils", () => {
  describe("finding the scores table", () => {
    it("finds the collected table whichever tool wrote it", () => {
      const boltz = file(
        `${RUN}/collect/boltz_confidence_scores_full.csv`,
        "stats_csv"
      );
      expect(findWispsScoresArtifact([boltz])).toBe(boltz);

      const colabfold = file(
        `${RUN}/collect/colabfold_confidence_scores_full.csv`,
        "stats_csv"
      );
      expect(findWispsScoresArtifact([colabfold])).toBe(colabfold);
    });

    it("ignores a look-alike outside the collect folder", () => {
      const stray = file(
        `${RUN}/run/boltz_confidence_scores_full.csv`,
        "stats_csv"
      );
      expect(findWispsScoresArtifact([stray])).toBeNull();
      expect(findWispsScoresArtifact([])).toBeNull();
    });
  });

  describe("finding the published structures", () => {
    it("keeps the lowest-ranked model for each id", () => {
      const best = file(`${RUN}/boltz_predictions/cif/seq1_model_0.cif`);
      const structures = findWispsStructures(
        [file(`${RUN}/boltz_predictions/cif/seq1_model_2.cif`), best],
        BOLTZ_LAYOUT
      );

      expect(structures.get("seq1")).toBe(best);
    });

    it("reads a ColabFold filename back to its id", () => {
      const pdb = file(
        `${RUN}/colabfold_predictions/pdb/seq1_unrelaxed_rank_001_alphafold2_ptm_model_3_seed_000.pdb`
      );
      const structures = findWispsStructures([pdb], COLABFOLD_LAYOUT);

      expect([...structures.keys()]).toEqual(["seq1"]);
    });

    it("keeps an id that holds the tool's own rank suffix", () => {
      const pdb = file(
        `${RUN}/colabfold_predictions/pdb/my_unrelaxed_rank_001_unrelaxed_rank_001_alphafold2_ptm_model_3_seed_000.pdb`
      );
      const structures = findWispsStructures([pdb], COLABFOLD_LAYOUT);

      expect([...structures.keys()]).toEqual(["my_unrelaxed_rank_001"]);
    });

    it("keeps a Boltz id that holds the tool's own model suffix", () => {
      const cif = file(`${RUN}/boltz_predictions/cif/seq_model_1_model_0.cif`);
      const structures = findWispsStructures([cif], BOLTZ_LAYOUT);

      expect([...structures.keys()]).toEqual(["seq_model_1"]);
    });

    it("ignores files published outside the tool's own folder", () => {
      const stray = file(`${RUN}/other/seq1_model_0.cif`);
      expect(findWispsStructures([stray], BOLTZ_LAYOUT).size).toBe(0);
    });
  });
});
