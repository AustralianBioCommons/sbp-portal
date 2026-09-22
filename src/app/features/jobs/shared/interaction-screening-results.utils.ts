/**
 * Interaction screening (WISPS). One row per pair the run scored *and* published
 * a complex for, so the scores table is normally longer than the report.
 */

import {
  ReportColumn,
  ReportRow,
  ReportSources,
  JobResultsAdapter,
  parseCsvTable,
  NO_INTERACTIONS_MESSAGE,
  registerJobResultsAdapter,
} from "./job-results-report.utils";
import { ResultFileRef, resultFilenames } from "./prediction-results.utils";
import {
  BOLTZ_LAYOUT,
  COLABFOLD_LAYOUT,
  StructureLayout,
  WISPS_RESULTS_SUFFIX,
  findWispsScoresArtifact,
  findWispsStructures,
} from "./wisps-results.utils";

const WORKFLOW = "interaction screening";

/** Split out of the pair id rather than read from the file. */
const QUERY_KEY = "queryId";
const TARGET_KEY = "targetId";
/** Replaces the two above when the pair id cannot be split. */
const PAIR_KEY = "pairId";

/** Not in the collected table yet; joined from the pipeline's own file. */
const IPSAE_KEY = "ipsae";
const IPSAE_FILE = "ipsae_scores.csv";
const IPSAE_DIR = "/ipsae/";

const SCORE_COLUMNS: readonly ReportColumn[] = [
  { key: IPSAE_KEY, heading: "ipSAE", numeric: true, higherIsBetter: true },
  { key: "iptm", heading: "ipTM", numeric: true, higherIsBetter: true },
  { key: "ptm", heading: "pTM", numeric: true, higherIsBetter: true },
];

const INTERACTION_COLUMNS: readonly ReportColumn[] = [
  { key: QUERY_KEY, heading: "Query ID", emphasised: true },
  { key: TARGET_KEY, heading: "Target ID" },
  ...SCORE_COLUMNS,
];

/** A heading that does not claim the pair id is one side of the pair. */
const UNSPLIT_COLUMNS: readonly ReportColumn[] = [
  { key: PAIR_KEY, heading: "Interaction", emphasised: true },
  ...SCORE_COLUMNS,
];

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

/** `Sample,<tool>`: the score column is named for the tool, so take it by position. */
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

export function parseSubmittedHeaders(
  fasta: string | null | undefined
): string[] {
  if (!fasta) return [];
  return fasta
    .split("\n")
    .filter((line) => line.startsWith(">"))
    .map((line) => line.slice(1).trim())
    .filter((header) => header.length > 0);
}

/**
 * The boundary has to fall so that both halves are headers the run was given.
 * WISPS writes `<query>-<target>`, so the first half is the query. Null if any
 * pair is unexplained, or explained more than one way.
 */
function splitFromHeaders(
  ids: readonly string[],
  headers: readonly string[]
): PairSplit | null {
  if (headers.length === 0) return null;
  const known = new Set(headers);
  const queries = new Set<string>();
  const targets = new Set<string>();

  for (const id of ids) {
    let found: [string, string] | null = null;
    for (let index = 0; index < id.length; index++) {
      if (id[index] !== "-") continue;
      const query = id.slice(0, index);
      const target = id.slice(index + 1);
      if (!known.has(query) || !known.has(target)) continue;
      if (found) return null;
      found = [query, target];
    }
    if (!found) return null;
    queries.add(found[0]);
    targets.add(found[1]);
  }

  return queries.size > 0 ? { queries, targets } : null;
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
 * Headers are free text and may hold hyphens (`anne-1-anne-3`), so the boundary
 * is read from the grid: the run pairs every query with every target, and a
 * split is valid when its sets reproduce the ids exactly.
 *
 * Two splits can both be valid — `anne-1-t1`/`anne-1-t2` reads as `anne-1`
 * against `t1`/`t2`, and equally as `anne` against `1-t1`/`1-t2`. Null in that
 * case; the fix is upstream, where the query and target ids are already known.
 */
function findPairSplit(
  ids: readonly string[],
  headers: readonly string[] = []
): PairSplit | null {
  const unique = [...new Set(ids)].filter((id) => id.length > 0);
  if (unique.length === 0) return null;

  const submitted = splitFromHeaders(unique, headers);
  if (submitted) return submitted;

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

/** The columns this run can fill, given whether its ids can be split. */
export function interactionColumns(
  text: string,
  submittedFasta?: string | null
): readonly ReportColumn[] {
  const { rows } = parseCsvTable(text);
  const split = findPairSplit(
    rows.map((row) => (row["id"] ?? "").trim()),
    parseSubmittedHeaders(submittedFasta)
  );
  return split ? INTERACTION_COLUMNS : UNSPLIT_COLUMNS;
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

  // Unshown: the table drops to its `Interaction` column in this case.
  return { query: "", target: "" };
}

export function parseInteractionRows(
  text: string,
  files: readonly ResultFileRef[],
  layout: StructureLayout,
  sources?: ReportSources | null
): ReportRow[] {
  const { extraText = null, submittedFasta = null } = sources ?? {};
  const { headers, rows } = parseCsvTable(text);
  const structures = findWispsStructures(files, layout);
  const ipsaeHeader = findIpsaeHeader(headers);
  const ipsaeScores = parseIpsaeScores(extraText);
  const split = findPairSplit(
    rows.map((row) => (row["id"] ?? "").trim()),
    parseSubmittedHeaders(submittedFasta)
  );

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
        [PAIR_KEY]: id,
        // The collected table wins once it carries the column.
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
    resultsFileName: WISPS_RESULTS_SUFFIX,
    // WISPS writes the query first and the target second, for every pair.
    primaryChainId: "A",
    panelHeading: "Interactions",
    emptyMessage: NO_INTERACTIONS_MESSAGE,
    legend: [
      { label: "Query", band: "primary" },
      { label: "Target", band: "secondary" },
    ],
    // Each row is a different pair of proteins, with nothing to line up on.
    superpose: false,
    findResultsArtifact: findWispsScoresArtifact,
    findExtraArtifact: findIpsaeArtifact,
    // The submitted headers settle an otherwise ambiguous pair id.
    needsSubmittedInputs: true,
    columnsFor: (text, sources) =>
      interactionColumns(text, sources?.submittedFasta),
    parseRows: (text, files, sources) =>
      parseInteractionRows(text, files, layout, sources),
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
