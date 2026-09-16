/**
 * Interaction screening (WISPS). One row per query/target pair the run scored,
 * paired with the complex the predictor wrote for it.
 */

import {
  ReportColumn,
  ReportRow,
  JobResultsAdapter,
  parseCsvTable,
  registerJobResultsAdapter,
} from "./job-results-report.utils";
import {
  ResultFileRef,
  StructureFormat,
  resultFilenames,
} from "./prediction-results.utils";

const WORKFLOW = "interaction screening";

/** Every tool writes the collected table under this name. */
const RESULTS_SUFFIX = "_confidence_scores_full.csv";
const COLLECT_DIR = "/collect/";

/** Derived from the pair id rather than read from the file. */
const QUERY_KEY = "queryId";
const TARGET_KEY = "targetId";

/**
 * ipSAE is not in the collected table yet — the pipeline writes it to its own
 * file. The column is here so it fills itself in once the table carries it.
 */
const IPSAE_KEY = "ipsae";

const INTERACTION_COLUMNS: readonly ReportColumn[] = [
  { key: QUERY_KEY, heading: "Query ID", emphasised: true },
  { key: TARGET_KEY, heading: "Target ID" },
  { key: IPSAE_KEY, heading: "ipSAE", numeric: true, higherIsBetter: true },
  { key: "iptm", heading: "ipTM", numeric: true, higherIsBetter: true },
  { key: "ptm", heading: "pTM", numeric: true, higherIsBetter: true },
];

/** The collected scores table, the row source for the whole report. */
export function findInteractionScoresArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  return (
    files.find(
      (file) =>
        file.key.toLowerCase().includes(COLLECT_DIR) &&
        resultFilenames(file).some((name) =>
          name.toLowerCase().endsWith(RESULTS_SUFFIX)
        )
    ) ?? null
  );
}

/** The header carrying ipSAE, whatever case the pipeline writes it in. */
function findIpsaeHeader(headers: readonly string[]): string | null {
  return (
    headers.find((header) => header.trim().toLowerCase() === "ipsae") ?? null
  );
}

/** A query set and a target set whose product is exactly the ids seen. */
interface PairSplit {
  queries: Set<string>;
  targets: Set<string>;
}

/**
 * Splits `<query>-<target>` ids without knowing where the boundary is: headers
 * are free text and may hold their own hyphens (`anne-1-anne-3`). The run pairs
 * every query with every target, so the ids are a complete grid — the split is
 * the one whose query and target sets reproduce that grid exactly.
 *
 * More than one split can fit (`anne-1-anne-3` also reads as one query `anne`
 * against `1-anne-3`), so the largest query set wins: that is the reading where
 * the shared `anne-` prefix belongs to the headers rather than to one query.
 */
function findPairSplit(ids: readonly string[]): PairSplit | null {
  const unique = [...new Set(ids)].filter((id) => id.length > 0);
  if (unique.length === 0) return null;

  const idSet = new Set(unique);
  // Any id would do; a stable pick keeps the result independent of file order.
  const sample = [...unique].sort()[0];

  let best: PairSplit | null = null;

  for (let index = 0; index < sample.length; index++) {
    if (sample[index] !== "-") continue;
    const query = sample.slice(0, index);
    const target = sample.slice(index + 1);
    if (!query || !target) continue;

    const targets = new Set(
      unique
        .filter((id) => id.startsWith(`${query}-`))
        .map((id) => id.slice(query.length + 1))
    );
    const queries = new Set(
      unique
        .filter((id) => id.endsWith(`-${target}`))
        .map((id) => id.slice(0, id.length - target.length - 1))
    );

    if (queries.size * targets.size !== idSet.size) continue;

    const complete = [...queries].every((q) =>
      [...targets].every((t) => idSet.has(`${q}-${t}`))
    );
    if (!complete) continue;

    if (!best || queries.size > best.queries.size) best = { queries, targets };
  }

  return best;
}

/** Splits one id, preferring the longest query that leaves a known target. */
function splitPairId(
  id: string,
  split: PairSplit | null
): { query: string; target: string } {
  if (split) {
    const matches = [...split.queries]
      .filter(
        (query) =>
          id.startsWith(`${query}-`) &&
          split.targets.has(id.slice(query.length + 1))
      )
      .sort((a, b) => b.length - a.length);
    if (matches.length > 0) {
      return { query: matches[0], target: id.slice(matches[0].length + 1) };
    }
  }

  // No grid to read: a partial run, or a single unpaired id.
  const boundary = id.indexOf("-");
  if (boundary < 0) return { query: id, target: "" };
  return { query: id.slice(0, boundary), target: id.slice(boundary + 1) };
}

/** Where one tool writes its complexes, and how their filenames are built. */
interface StructureLayout {
  directory: string;
  /** Captures the pair id from the filename. */
  pattern: RegExp;
  format: StructureFormat;
}

const BOLTZ_LAYOUT: StructureLayout = {
  directory: "/boltz_predictions/cif/",
  // Greedy, so an id ending in `_model_0` still yields the whole id.
  pattern: /^(.+)_model_\d+\.cif$/i,
  format: "mmcif",
};

const COLABFOLD_LAYOUT: StructureLayout = {
  directory: "/colabfold_predictions/pdb/",
  pattern: /^(.+?)_unrelaxed_rank_\d+.*\.pdb$/i,
  format: "pdb",
};

/** Pair id to its complex, for the pairs this run actually published. */
function findStructures(
  files: readonly ResultFileRef[],
  layout: StructureLayout
): Map<string, ResultFileRef> {
  const structures = new Map<string, ResultFileRef>();

  for (const file of files) {
    if (!file.key.toLowerCase().includes(layout.directory)) continue;
    // Case intact: the pair id carries the user's own header case.
    const match = resultFilenames(file)
      .map((name) => layout.pattern.exec(name))
      .find((candidate) => candidate !== null);
    if (!match) continue;
    structures.set(match[1], file);
  }

  return structures;
}

/**
 * Rows for the pairs with a structure to show. The run filters what it writes
 * by a score threshold, so the table normally lists more pairs than it kept.
 */
export function parseInteractionRows(
  text: string,
  files: readonly ResultFileRef[],
  layout: StructureLayout
): ReportRow[] {
  const { headers, rows } = parseCsvTable(text);
  const structures = findStructures(files, layout);
  const ipsaeHeader = findIpsaeHeader(headers);
  const split = findPairSplit(rows.map((row) => (row["id"] ?? "").trim()));

  const reportRows: ReportRow[] = [];

  for (const row of rows) {
    const id = (row["id"] ?? "").trim();
    const structure = structures.get(id);
    if (!id || !structure) continue;

    const { query, target } = splitPairId(id, split);

    reportRows.push({
      id,
      label: id,
      values: {
        ...row,
        [QUERY_KEY]: query,
        [TARGET_KEY]: target,
        [IPSAE_KEY]: ipsaeHeader ? row[ipsaeHeader] ?? "" : "",
      },
      structure: {
        key: structure.key,
        label: structure.label,
        format: layout.format,
      },
    });
  }

  return reportRows;
}

function interactionAdapter(
  tool: string,
  layout: StructureLayout
): JobResultsAdapter {
  return {
    workflow: WORKFLOW,
    tool,
    columns: INTERACTION_COLUMNS,
    resultsFileName: RESULTS_SUFFIX,
    // WISPS writes the query first and the target second, for every pair.
    primaryChainId: "A",
    panelHeading: "Interactions",
    emptyMessage: "No high confidence interactions were identified.",
    legend: [
      { label: "Query", band: "primary" },
      { label: "Target", band: "secondary" },
    ],
    // Each row is a different pair of proteins, with nothing to line up on.
    superpose: false,
    findResultsArtifact: findInteractionScoresArtifact,
    parseRows: (text, files) => parseInteractionRows(text, files, layout),
  };
}

export const interactionScreeningBoltzAdapter = interactionAdapter(
  "boltz",
  BOLTZ_LAYOUT
);
export const interactionScreeningColabFoldAdapter = interactionAdapter(
  "colabfold",
  COLABFOLD_LAYOUT
);

registerJobResultsAdapter(interactionScreeningBoltzAdapter);
registerJobResultsAdapter(interactionScreeningColabFoldAdapter);
