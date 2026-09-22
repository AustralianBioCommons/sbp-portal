/** Output layout of the WISPS pipeline, shared by interaction screening and bulk prediction. */

import {
  ResultFileRef,
  StructureFormat,
  resultFilenames,
} from "./prediction-results.utils";

export const WISPS_RESULTS_SUFFIX = "_confidence_scores_full.csv";
const COLLECT_DIR = "/collect/";

export function findWispsScoresArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  return (
    files.find(
      (file) =>
        file.key.toLowerCase().includes(COLLECT_DIR) &&
        resultFilenames(file).some((name) =>
          name.toLowerCase().endsWith(WISPS_RESULTS_SUFFIX)
        )
    ) ?? null
  );
}

/** Where one tool publishes its structures, and how it names them. */
export interface StructureLayout {
  directory: string;
  /** Captures the id, then the model rank. */
  pattern: RegExp;
  format: StructureFormat;
}

export const BOLTZ_LAYOUT: StructureLayout = {
  directory: "/boltz_predictions/cif/",
  // Greedy, so an id ending in `_model_0` survives.
  pattern: /^(.+)_model_(\d+)\.cif$/i,
  format: "mmcif",
};

export const COLABFOLD_LAYOUT: StructureLayout = {
  directory: "/colabfold_predictions/pdb/",
  pattern: /^(.+)_unrelaxed_rank_(\d+)(?:_.*)?\.pdb$/i,
  format: "pdb",
};

/** Lowest rank wins where a tool published several models. */
export function findWispsStructures(
  files: readonly ResultFileRef[],
  layout: StructureLayout
): Map<string, ResultFileRef> {
  const best = new Map<string, { file: ResultFileRef; rank: number }>();

  for (const file of files) {
    if (!file.key.toLowerCase().includes(layout.directory)) continue;
    // Case intact: the id carries the user's header case.
    const match = resultFilenames(file)
      .map((name) => layout.pattern.exec(name))
      .find((candidate) => candidate !== null);
    if (!match) continue;

    const rank = Number(match[2]);
    const current = best.get(match[1]);
    if (!current || rank < current.rank) best.set(match[1], { file, rank });
  }

  return new Map([...best].map(([id, entry]) => [id, entry.file]));
}
