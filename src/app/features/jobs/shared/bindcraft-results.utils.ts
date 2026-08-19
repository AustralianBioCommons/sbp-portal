/**
 * BindCraft's adapter. A run publishes:
 *
 *   <run>/ranker/<sample>_final_design_stats.csv
 *   <run>/ranker/<sample>_Ranked/<rank>_<design>_model<n>.pdb
 *
 * so the CSV's `Design` is the ranked filename without its rank and `_model<n>`.
 */

import {
  DeNovoDesignAdapter,
  DesignColumn,
  DesignRow,
  DesignStructure,
  parseCsvTable,
  registerDeNovoDesignAdapter,
} from "./de-novo-results.utils";
import { ResultFileRef, resultFilenames } from "./prediction-results.utils";

/** The table, in display order. A new column is just another entry here. */
export const BINDCRAFT_COLUMNS: readonly DesignColumn[] = [
  // Rank 1 holds the highest ipTM, so both open on the same ordering.
  { key: "Rank", heading: "Rank", emphasised: true, numeric: true },
  {
    key: "Average_i_pTM",
    heading: "ipTM",
    numeric: true,
    higherIsBetter: true,
  },
  { key: "Length", heading: "Design Length", numeric: true },
  // Alphabetical order says nothing about a sequence or a generated name.
  {
    key: "Sequence",
    heading: "Design Sequence",
    sequence: true,
    sortable: false,
  },
  { key: "Design", heading: "Design name", sortable: false },
];

const STATS_SUFFIX = "_final_design_stats.csv";

/** The ranker's copy, which the ranked structures were written from. */
export function findBindCraftStatsArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  let fallback: ResultFileRef | null = null;

  for (const file of files) {
    const isStats = resultFilenames(file).some((name) =>
      name.toLowerCase().endsWith(STATS_SUFFIX)
    );
    if (!isStats) continue;
    if (file.key.toLowerCase().includes("/ranker/")) return file;
    fallback ??= file;
  }

  return fallback;
}

/** `1_design_model1.pdb` split into its rank and the rest. */
const RANKED_PDB = /^(\d+)_(.+)\.pdb$/i;

interface RankedStructure extends DesignStructure {
  rank: string;
  /** Filename with the rank prefix and extension removed. */
  stem: string;
}

/** The ranked PDBs, the only structures a design maps onto. */
function findRankedStructures(
  files: readonly ResultFileRef[]
): RankedStructure[] {
  const structures: RankedStructure[] = [];

  for (const file of files) {
    // Only the ranker's `<sample>_Ranked/` copies are published.
    if (!/_ranked\//i.test(file.key)) continue;

    // Case intact: `Design` is case-sensitive.
    const match = resultFilenames(file)
      .map((candidate) => RANKED_PDB.exec(candidate))
      .find((candidate) => candidate !== null);
    if (!match) continue;

    structures.push({
      key: file.key,
      label: file.label,
      format: "pdb",
      rank: match[1],
      stem: match[2],
    });
  }

  return structures;
}

/**
 * On the design name, at a `_` boundary so `_mpnn1` cannot claim `_mpnn13`.
 * Rank only breaks a tie between models; alone it could pair the wrong design.
 */
function matchStructure(
  rank: string,
  design: string,
  structures: readonly RankedStructure[]
): DesignStructure | null {
  if (!design) return null;

  const byDesign = structures.filter(
    (structure) =>
      structure.stem === design || structure.stem.startsWith(`${design}_`)
  );

  return (
    byDesign.find((structure) => structure.rank === rank) ?? byDesign[0] ?? null
  );
}

export function parseBindCraftDesigns(
  rows: ReadonlyArray<Record<string, string>>,
  files: readonly ResultFileRef[]
): DesignRow[] {
  const structures = findRankedStructures(files);

  return rows.map((row, index) => {
    const rank = (row["Rank"] ?? "").trim();
    const design = (row["Design"] ?? "").trim();
    return {
      // The index keeps ids unique even if rank or design repeat.
      id: `${index}-${rank}-${design}`,
      label: design || `Design ${rank || index + 1}`,
      values: row,
      structure: matchStructure(rank, design, structures),
    };
  });
}

export const bindCraftAdapter: DeNovoDesignAdapter = {
  tool: "bindcraft",
  columns: BINDCRAFT_COLUMNS,
  resultsFileName: STATS_SUFFIX,
  findResultsArtifact: findBindCraftStatsArtifact,
  parseRows: (text, files) =>
    parseBindCraftDesigns(parseCsvTable(text).rows, files),
};

registerDeNovoDesignAdapter(bindCraftAdapter);
