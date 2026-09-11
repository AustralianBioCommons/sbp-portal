import {
  DeNovoDesignAdapter,
  DesignColumn,
  DesignRow,
  DesignStructure,
  parseCsvTable,
  registerDeNovoDesignAdapter,
} from "./de-novo-results.utils";
import { ResultFileRef, resultFilenames } from "./prediction-results.utils";

const RESULTS_FILE_NAME = "ranked_designs.csv";
const ARCHIVE_FILE_NAME = "ranked_designs.tar.gz";

/** Rank, then the metric columns, then the design itself. */
const LEADING_COLUMNS: readonly DesignColumn[] = [
  // ProteinDJ ranks by the run's own metric, so rank and that column agree.
  { key: "rank", heading: "Rank", emphasised: true, numeric: true },
];

const TRAILING_COLUMNS: readonly DesignColumn[] = [
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

/**
 * AlphaFold2 Initial Guess: pLDDT runs 0-100 and PAE is in Angstroms. The ranked
 * CSV has no af2_iptm, so PAE is what describes the interface.
 */
const AF2_COLUMNS: readonly DesignColumn[] = [
  {
    key: "af2_plddt_overall",
    heading: "pLDDT",
    numeric: true,
    higherIsBetter: true,
  },
  // A good overall pLDDT can come from the target alone, so show the binder's
  // own score next to it.
  {
    key: "af2_plddt_binder",
    heading: "pLDDT (Binder)",
    numeric: true,
    higherIsBetter: true,
  },
  // The AF2 ranking metric, so rank and this column agree.
  { key: "af2_pae_interaction", heading: "PAE Interaction", numeric: true },
];

/** Boltz-2 scores pLDDT and ipSAE 0-1, so these are not the AF2 columns rescaled. */
const BOLTZ_COLUMNS: readonly DesignColumn[] = [
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
  metrics: readonly DesignColumn[]
): readonly DesignColumn[] {
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
): readonly DesignColumn[] {
  const hasBoltz = headers.some((header) => header.startsWith("boltz_"));
  const hasAf2 = headers.some((header) => header.startsWith("af2_"));
  // 'af2_boltz' runs carry both; Boltz is the later, more refined stage.
  return hasBoltz && !hasAf2
    ? RFDIFFUSION_BOLTZ_COLUMNS
    : RFDIFFUSION_AF2_COLUMNS;
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
 * Every design's PDB lives inside this one tarball, since ProteinDJ never
 * publishes them separately, so the viewer reads them out of it.
 */
export function findRfDiffusionStructureArchive(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  return (
    files.find((file) =>
      resultFilenames(file).some(
        (name) => name.toLowerCase() === ARCHIVE_FILE_NAME
      )
    ) ?? null
  );
}

/**
 * `ranked_designs/01_fold_0_seq_1_af2pred.pdb`. The rank prefix is padded out to
 * the width of the design count, so compare it as a number.
 */
const RANKED_MEMBER =
  /(?:^|\/)(\d+)_fold_(\d+)_seq_(\d+)_(?:af2|boltz)pred\.pdb$/i;

interface RankedMember {
  entry: string;
  rank: number;
  /** `fold_<id>_seq_<id>`, which identifies the design on its own. */
  designId: string;
}

function parseRankedMembers(entries: readonly string[]): RankedMember[] {
  const members: RankedMember[] = [];

  for (const entry of entries) {
    const match = RANKED_MEMBER.exec(entry);
    if (!match) continue;
    members.push({
      entry,
      rank: Number(match[1]),
      designId: `fold_${Number(match[2])}_seq_${Number(match[3])}`,
    });
  }

  return members;
}

/** `0`, `1.0` and ` 2 ` all mean an id the filenames write as a plain integer. */
function normaliseId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? String(parsed) : null;
}

/**
 * Matches on fold and sequence id, which identify the design outright. Rank is
 * only a fallback, since ranking can drop designs and shift it.
 */
function matchMember(
  row: Record<string, string>,
  members: readonly RankedMember[]
): RankedMember | null {
  const foldId = normaliseId(row["fold_id"] ?? "");
  const seqId = normaliseId(row["seq_id"] ?? "");

  if (foldId !== null && seqId !== null) {
    const designId = `fold_${foldId}_seq_${seqId}`;
    const byDesign = members.find((member) => member.designId === designId);
    if (byDesign) return byDesign;
  }

  const rank = normaliseId(row["rank"] ?? "");
  if (rank === null) return null;
  return members.find((member) => member.rank === Number(rank)) ?? null;
}

export function parseRfDiffusionDesigns(
  rows: ReadonlyArray<Record<string, string>>,
  archive: ResultFileRef | null,
  archiveEntries: readonly string[]
): DesignRow[] {
  const members = archive ? parseRankedMembers(archiveEntries) : [];

  return rows.map((row, index) => {
    const rank = (row["rank"] ?? "").trim();
    const description = (row["description"] ?? "").trim();
    const member = archive ? matchMember(row, members) : null;

    const structure: DesignStructure | null =
      member && archive
        ? {
            key: archive.key,
            label: member.entry.split("/").pop() ?? member.entry,
            format: "pdb",
            entry: member.entry,
          }
        : null;

    return {
      // The index keeps ids unique even when rank or description repeat.
      id: `${index}-${rank}-${description}`,
      label: description || `Design ${rank || index + 1}`,
      values: row,
      structure,
    };
  });
}

export const rfDiffusionAdapter: DeNovoDesignAdapter = {
  tool: "rfdiffusion",
  columns: RFDIFFUSION_AF2_COLUMNS,
  resultsFileName: RESULTS_FILE_NAME,
  // ProteinDJ writes the binder first, the opposite way round to BindCraft.
  binderChainId: "A",
  designLengthKey: "seq_length",
  findResultsArtifact: findRfDiffusionResultsArtifact,
  findStructureArchive: findRfDiffusionStructureArchive,
  columnsFor: (text) => findRfDiffusionColumns(parseCsvTable(text).headers),
  parseRows: (text, files, archiveEntries) =>
    parseRfDiffusionDesigns(
      parseCsvTable(text).rows,
      findRfDiffusionStructureArchive(files),
      archiveEntries ?? []
    ),
};

registerDeNovoDesignAdapter(rfDiffusionAdapter);
