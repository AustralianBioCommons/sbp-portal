/**
 * Interaction screening (WISPS). One row per query/target pair the run both
 * scored *and* published a complex for — the pipeline filters what it writes by
 * a score threshold, so the scores table is normally longer than this report.
 * Anything reading these rows should not assume they mirror the table.
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
 * ipSAE is not in the collected table yet — the pipeline writes it to
 * `ipsae/ipsae_scores.csv`, keyed by the same pair id. Read from the table when
 * it is there, and joined from that file otherwise.
 */
const IPSAE_KEY = "ipsae";
const IPSAE_FILE = "ipsae_scores.csv";
const IPSAE_DIR = "/ipsae/";

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

/** The per-pair ipSAE scores, which the collected table does not yet carry. */
export function findIpsaeArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  return (
    files.find(
      (file) =>
        file.key.toLowerCase().includes(IPSAE_DIR) &&
        resultFilenames(file).some((name) => name.toLowerCase() === IPSAE_FILE)
    ) ?? null
  );
}

/**
 * Pair id to ipSAE, from `Sample,<tool>`. The score column is named for the
 * tool that produced it, so it is taken by position rather than by name.
 */
export function parseIpsaeScores(text: string | null): Map<string, string> {
  const scores = new Map<string, string>();
  if (!text) return scores;

  const { headers, rows } = parseCsvTable(text);
  const idHeader =
    headers.find((header) => header.trim().toLowerCase() === "sample") ??
    headers[0];
  const scoreHeader = headers.find((header) => header !== idHeader);
  if (!idHeader || !scoreHeader) return scores;

  for (const row of rows) {
    const id = (row[idHeader] ?? "").trim();
    if (id) scores.set(id, (row[scoreHeader] ?? "").trim());
  }

  return scores;
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

/** Every id has exactly one hyphen, so the boundary is not in doubt. */
function splitAtOnlyHyphen(ids: readonly string[]): PairSplit | null {
  const queries = new Set<string>();
  const targets = new Set<string>();

  for (const id of ids) {
    const boundary = id.indexOf("-");
    if (boundary < 0 || boundary !== id.lastIndexOf("-")) return null;
    queries.add(id.slice(0, boundary));
    targets.add(id.slice(boundary + 1));
  }

  return queries.size > 0 ? { queries, targets } : null;
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

/**
 * Splits `<query>-<target>` ids when the boundary can be known. Headers are free
 * text and may hold hyphens of their own (`anne-1-anne-3`), so the boundary is
 * read from the grid: the run pairs every query with every target, and a split
 * is valid when its query and target sets reproduce the ids exactly.
 *
 * Several splits can be valid at once — `anne-1-t1`/`anne-1-t2` is one query
 * `anne-1` against two targets, and equally one query `anne` against `1-t1` and
 * `1-t2`. Nothing in the ids says which, so this returns null rather than pick,
 * and the report shows the pair id whole. The fix is upstream: the collected
 * table should carry the query and target ids the pipeline already knows.
 */
function findPairSplit(ids: readonly string[]): PairSplit | null {
  const unique = [...new Set(ids)].filter((id) => id.length > 0);
  if (unique.length === 0) return null;

  const only = splitAtOnlyHyphen(unique);
  if (only) return only;

  const idSet = new Set(unique);
  // Any id would do; a stable pick keeps the result independent of file order.
  const sample = [...unique].sort()[0];

  let found: PairSplit | null = null;

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

    // A second, different reading means the ids cannot settle it.
    if (found && !sameSet(queries, found.queries)) return null;
    found ??= { queries, targets };
  }

  return found;
}

/** Splits one id, or keeps it whole when the boundary is not knowable. */
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

  // Showing the pair whole beats showing a confident guess at the wrong split.
  return { query: id, target: "" };
}

/** Where one tool writes its complexes, and how their filenames are built. */
interface StructureLayout {
  directory: string;
  /** Captures the pair id, then the model's rank among that pair's outputs. */
  pattern: RegExp;
  format: StructureFormat;
}

const BOLTZ_LAYOUT: StructureLayout = {
  directory: "/boltz_predictions/cif/",
  // Greedy, so an id ending in `_model_0` still yields the whole id. Model 0 is
  // Boltz's best.
  pattern: /^(.+)_model_(\d+)\.cif$/i,
  format: "mmcif",
};

const COLABFOLD_LAYOUT: StructureLayout = {
  directory: "/colabfold_predictions/pdb/",
  // ColabFold can publish ranks 001-005; 001 is the top-ranked one.
  pattern: /^(.+?)_unrelaxed_rank_(\d+)(?:_.*)?\.pdb$/i,
  format: "pdb",
};

/**
 * Pair id to its best complex, for the pairs this run actually published. A tool
 * may write several models per pair, so the lowest rank wins rather than
 * whichever file the download list happened to end on.
 */
function findStructures(
  files: readonly ResultFileRef[],
  layout: StructureLayout
): Map<string, ResultFileRef> {
  const best = new Map<string, { file: ResultFileRef; rank: number }>();

  for (const file of files) {
    if (!file.key.toLowerCase().includes(layout.directory)) continue;
    // Case intact: the pair id carries the user's own header case.
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

/**
 * Rows for the pairs with a structure to show. The run filters what it writes
 * by a score threshold, so the table normally lists more pairs than it kept.
 */
export function parseInteractionRows(
  text: string,
  files: readonly ResultFileRef[],
  layout: StructureLayout,
  ipsaeText: string | null = null
): ReportRow[] {
  const { headers, rows } = parseCsvTable(text);
  const structures = findStructures(files, layout);
  const ipsaeHeader = findIpsaeHeader(headers);
  const ipsaeScores = parseIpsaeScores(ipsaeText);
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
        // The collected table wins once it carries the column; until then the
        // score is joined from the pipeline's own per-pair file.
        [IPSAE_KEY]: ipsaeHeader ? row[ipsaeHeader] : ipsaeScores.get(id) ?? "",
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
    findExtraArtifact: findIpsaeArtifact,
    parseRows: (text, files, ipsaeText) =>
      parseInteractionRows(text, files, layout, ipsaeText),
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
