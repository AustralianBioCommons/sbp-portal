import {
  JobResultsAdapter,
  ReportColumn,
  ReportRow,
  ReportStructure,
  parseCsvTable,
  registerJobResultsAdapter,
} from "./job-results-report.utils";
import { ResultFileRef, resultFilenames } from "./prediction-results.utils";

const RESULTS_FILE_NAME = "ranked_designs.csv";
const RANKED_DESIGNS_DIR = "/results/ranked_designs/";

/** Rank, then the metric columns, then the design itself. */
const LEADING_COLUMNS: readonly ReportColumn[] = [
  // ProteinDJ ranks by the run's own metric, so rank and that column agree.
  { key: "rank", heading: "Rank", emphasised: true, numeric: true },
];

const TRAILING_COLUMNS: readonly ReportColumn[] = [
  { key: "seq_length", heading: "Design Length", numeric: true },
  // Alphabetical order says nothing about a sequence or a generated name.
  {
    key: "sequence",
    heading: "Design Sequence",
    sequence: true,
    sortable: false,
  },
  { key: "description", heading: "Design name", sortable: false },
];

/** AlphaFold2 Initial Guess: PAE is in Angstroms and ipTM runs 0-1. */
const AF2_COLUMNS: readonly ReportColumn[] = [
  // The AF2 ranking metric, so rank and this column agree.
  { key: "af2_pae_interaction", heading: "PAE Interaction", numeric: true },
  { key: "af2_iptm", heading: "ipTM", numeric: true, higherIsBetter: true },
];

/** Boltz-2 scores pLDDT and ipSAE 0-1, so these are not the AF2 columns rescaled. */
const BOLTZ_COLUMNS: readonly ReportColumn[] = [
  { key: "boltz_plddt", heading: "pLDDT", numeric: true, higherIsBetter: true },
  {
    // Header case is the pipeline's own.
    key: "boltz_ipSAE_min",
    heading: "ipSAE",
    numeric: true,
    higherIsBetter: true,
  },
  {
    key: "boltz_iptm",
    heading: "ipTM",
    numeric: true,
    higherIsBetter: true,
  },
];

function withMetrics(
  metrics: readonly ReportColumn[]
): readonly ReportColumn[] {
  return [...LEADING_COLUMNS, ...metrics, ...TRAILING_COLUMNS];
}

export const RFDIFFUSION_AF2_COLUMNS = withMetrics(AF2_COLUMNS);
export const RFDIFFUSION_BOLTZ_COLUMNS = withMetrics(BOLTZ_COLUMNS);

/**
 * Picks the columns for whichever predictor checked the designs. ProteinDJ
 * writes af2_* or boltz_* depending on `pred_method`, and the two use different
 * scales, so they cannot share a column.
 */
export function findRfDiffusionColumns(
  headers: readonly string[]
): readonly ReportColumn[] {
  // 'af2_boltz' runs carry both families. Boltz runs last on what AF2 passed
  // through, and ranks those designs, so its metrics are the ones beside Rank.
  const hasBoltz = headers.some((header) => header.startsWith("boltz_"));
  const columns = hasBoltz
    ? RFDIFFUSION_BOLTZ_COLUMNS
    : RFDIFFUSION_AF2_COLUMNS;

  const present = new Set(headers);
  return columns.filter((column) => present.has(column.key));
}

/** The ranked CSV, the table every other column is read from. */
export function findRfDiffusionResultsArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  return (
    files.find((file) =>
      resultFilenames(file).some(
        (name) => name.toLowerCase() === RESULTS_FILE_NAME
      )
    ) ?? null
  );
}

/**
 * `ranked_designs/01_fold_0_seq_1_af2pred.pdb`. The rank prefix is padded out to
 * the width of the design count, so compare it as a number.
 */
const RANKED_DESIGN = /^(\d+)_fold_(\d+)_seq_(\d+)_(?:af2|boltz)pred\.pdb$/i;

interface RankedDesign {
  file: ResultFileRef;
  rank: number;
  /** `fold_<id>_seq_<id>`, which identifies the design on its own. */
  designId: string;
}

/** The published designs, the only structures a row can map onto. */
function findRankedDesigns(files: readonly ResultFileRef[]): RankedDesign[] {
  const designs: RankedDesign[] = [];

  for (const file of files) {
    if (!file.key.toLowerCase().includes(RANKED_DESIGNS_DIR)) continue;
    const match = resultFilenames(file)
      .map((name) => RANKED_DESIGN.exec(name))
      .find((candidate) => candidate !== null);
    if (!match) continue;

    designs.push({
      file,
      rank: Number(match[1]),
      designId: `fold_${Number(match[2])}_seq_${Number(match[3])}`,
    });
  }

  return designs;
}

function normaliseId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? String(parsed) : null;
}

/**
 * Matches on fold and sequence id, which identify the design outright. A row
 * carrying them pairs on them alone: falling back to rank could hand it another
 * design's file. Rank is only for rows the CSV left without ids.
 */
function matchDesign(
  row: Record<string, string>,
  designs: readonly RankedDesign[]
): RankedDesign | null {
  const foldId = normaliseId(row["fold_id"] ?? "");
  const seqId = normaliseId(row["seq_id"] ?? "");

  if (foldId !== null && seqId !== null) {
    const designId = `fold_${foldId}_seq_${seqId}`;
    return designs.find((design) => design.designId === designId) ?? null;
  }

  const rank = normaliseId(row["rank"] ?? "");
  if (rank === null) return null;
  return designs.find((design) => design.rank === Number(rank)) ?? null;
}

export function parseRfDiffusionDesigns(
  rows: ReadonlyArray<Record<string, string>>,
  files: readonly ResultFileRef[]
): ReportRow[] {
  const designs = findRankedDesigns(files);

  return rows.map((row, index) => {
    const rank = (row["rank"] ?? "").trim();
    const description = (row["description"] ?? "").trim();
    const design = matchDesign(row, designs);

    const structure: ReportStructure | null = design
      ? { key: design.file.key, label: design.file.label, format: "pdb" }
      : null;

    return {
      id: `${index}-${rank}-${description}`,
      label: description || `Design ${rank || index + 1}`,
      values: row,
      structure,
    };
  });
}

export const rfDiffusionAdapter: JobResultsAdapter = {
  workflow: "de novo design",
  tool: "rfdiffusion",
  columns: RFDIFFUSION_AF2_COLUMNS,
  resultsFileName: RESULTS_FILE_NAME,
  // ProteinDJ writes the binder first, the opposite way round to BindCraft.
  primaryChainId: "A",
  primaryLengthKey: "seq_length",
  panelHeading: "Ranked designs",
  emptyMessage:
    "No designs passed in silico quality control criteria. Consider choosing " +
    "different hotspots or increasing the number of trajectories.",
  // The binder band takes the selected design's own name.
  legend: [
    { label: "Target", band: "secondary" },
    { label: null, band: "primary" },
  ],
  // Every design targets the same protein, so they line up on it.
  superpose: true,
  findResultsArtifact: findRfDiffusionResultsArtifact,
  columnsFor: (text) => findRfDiffusionColumns(parseCsvTable(text).headers),
  parseRows: (text, files) =>
    parseRfDiffusionDesigns(parseCsvTable(text).rows, files),
};

registerJobResultsAdapter(rfDiffusionAdapter);
// BindCraft now runs through the same ProteinDJ-based pipeline as RFdiffusion,
// so its output is identical (same CSV, PDB naming and chain layout) — reuse
// this adapter rather than maintaining a second, now-stale one.
registerJobResultsAdapter({ ...rfDiffusionAdapter, tool: "bindcraft" });
