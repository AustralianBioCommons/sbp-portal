/**
 * The workflow-agnostic half of the job results report. A new workflow
 * is added by writing an adapter and registering it.
 */

import { ResultFileRef, StructureFormat } from "./prediction-results.utils";

/** One column of the results table, in display order. */
export interface ReportColumn {
  /** Key into `ReportRow.values`, normally the source file's column name. */
  key: string;
  heading: string;
  /** Renders the heading bold. */
  emphasised?: boolean;
  /** Sort as a number, rather than as text. */
  numeric?: boolean;
  /** Higher is better, so the table opens the column descending. */
  higherIsBetter?: boolean;
  /** Sortable unless set false. Off for a sequence or a name. */
  sortable?: boolean;
  /** Long free text: monospace and wrapped. */
  sequence?: boolean;
}

const MAX_DECIMALS = 3;

/** Rounds a number with more than three places; anything shorter shows as written. */
export function formatDecimals(value: string | number): string {
  const text = String(value);
  const decimals = text.trim().split(".")[1] ?? "";
  if (decimals.length <= MAX_DECIMALS) return text;
  const number = Number(text);
  return Number.isFinite(number)
    ? String(Number(number.toFixed(MAX_DECIMALS)))
    : text;
}

/** The structure a row was written to, ready for the viewer. */
export interface ReportStructure {
  key: string;
  label: string;
  format: StructureFormat;
}

/** One row: the cells to show plus the structure the viewer loads for it. */
export interface ReportRow {
  /** Stable across re-sorts and re-pages; used for tracking and selection. */
  id: string;
  /** How the row is named outside the table, e.g. above the viewer. */
  label: string;
  values: Record<string, string>;
  /** Null when no structure could be matched to this row. */
  structure: ReportStructure | null;
}

/**
 * One band of the colour key above the viewer. `primary` is the highlighted
 * chain, `secondary` everything else. A null label uses the selected row's own.
 */
export interface ReportLegendBand {
  label: string | null;
  band: "primary" | "secondary";
}

/** Everything a row can be built from beyond the results table itself. */
export interface ReportSources {
  /** Body of `findExtraArtifact`, or null when there is none to read. */
  extraText?: string | null;
  /** The run's submitted FASTA, when the adapter asked for it. */
  submittedFasta?: string | null;
}

/** What one workflow contributes: its table, and how a row finds a structure. */
export interface JobResultsAdapter {
  /** Normalised workflow name, as `normalizeWorkflowName` reports it. */
  workflow: string;
  /** Lower-case tool id, as the job's `tool` field reports it. */
  tool: string;
  columns: readonly ReportColumn[];
  /** Names the results file in the empty state, e.g. "_final_design_stats.csv". */
  resultsFileName: string;
  /**
   * Chain to highlight; everything else takes the secondary colour. The
   * pipelines disagree on this, so it cannot be guessed.
   */
  primaryChainId: string;
  /** Column holding the primary chain's length, used to double-check it. */
  primaryLengthKey?: string;
  /** Heading over the table panel; the row count is appended. */
  panelHeading: string;
  /** Shown instead of the report when the run ranked nothing. */
  emptyMessage: string;
  /** Viewer palette; `binder-target` by default. `plddt` ignores `legend`. */
  colorTheme?: "binder-target" | "plddt";
  /** Colour key above the viewer, in display order. Empty under `plddt`. */
  legend: readonly ReportLegendBand[];
  /**
   * Whether rows are variants of one complex, so the viewer can line them up
   * and hold the camera. Off where each row is a different pair of molecules.
   */
  superpose: boolean;
  /** The run's results table, or null when it has not produced one. */
  findResultsArtifact(files: readonly ResultFileRef[]): ResultFileRef | null;
  /**
   * A second file joined onto the rows, for a workflow whose results table does
   * not carry every column on its own. Fetched alongside the results table, and
   * optional: a run that never wrote it still renders.
   */
  findExtraArtifact?(files: readonly ResultFileRef[]): ResultFileRef | null;
  /**
   * Whether the report should also read the run's submitted form, for an
   * adapter that cannot interpret its outputs without the original inputs.
   */
  needsSubmittedInputs?: boolean;
  /**
   * Picks columns from the results file, for a workflow that can produce more
   * than one set. `columns` is used until the file has loaded.
   */
  columnsFor?(text: string, sources?: ReportSources): readonly ReportColumn[];
  /** Rows in file order, each paired with its structure. */
  parseRows(
    text: string,
    files: readonly ResultFileRef[],
    sources?: ReportSources
  ): ReportRow[];
}

/** Shown by both de novo design tools when the ranker kept nothing. */
export const NO_DESIGNS_MESSAGE =
  "No designs passed in silico quality control criteria. Consider choosing " +
  "different hotspots or increasing the number of trajectories.";

const SCORES_IN_FILES =
  "Scores for everything the run evaluated are listed under the Files tab.";

/** Interaction screening: the score filter kept no pairs. */
export const NO_INTERACTIONS_MESSAGE = `No high confidence interactions were identified. ${SCORES_IN_FILES}`;

/** Bulk prediction: the score filter kept no structures. */
export const NO_PREDICTIONS_MESSAGE = `No high confidence predictions were identified. ${SCORES_IN_FILES}`;

/** One workflow's tool can only mean one report, so both parts key the map. */
function adapterKey(workflow: string, tool: string): string {
  return `${workflow.trim().toLowerCase()}|${tool.trim().toLowerCase()}`;
}

const adapters = new Map<string, JobResultsAdapter>();

/** Called once per workflow/tool pair, from that workflow's module. */
export function registerJobResultsAdapter(adapter: JobResultsAdapter): void {
  adapters.set(adapterKey(adapter.workflow, adapter.tool), adapter);
}

/** Null for a workflow or tool the report cannot show yet. */
export function getJobResultsAdapter(
  workflow: string | null | undefined,
  tool: string | null | undefined
): JobResultsAdapter | null {
  return adapters.get(adapterKey(workflow ?? "", tool ?? "")) ?? null;
}

/** Header names and rows, both as read from the file. */
export interface CsvTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

/** Quote-aware: these files hold fields with commas of their own. */
export function parseCsvTable(text: string): CsvTable {
  const records = splitCsvRecords(text);
  const headers = records.shift();
  // An empty file yields one empty cell, which is not a header.
  if (!headers || !headers.some((header) => header.length > 0)) {
    return { headers: [], rows: [] };
  }

  const rows = records
    // A trailing newline yields one empty cell, not a record.
    .filter((cells) => cells.some((cell) => cell.length > 0))
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? "";
      });
      return row;
    });

  return { headers, rows };
}

/** One pass; quotes suspend the separator and newline. */
function splitCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (text[index + 1] === '"') {
        // A doubled quote is one literal quote.
        cell += '"';
        index++;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      cells.push(cell.trim());
      records.push(cells);
      cells = [];
      cell = "";
      // Consume the second half of a CRLF.
      if (char === "\r" && text[index + 1] === "\n") index++;
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  records.push(cells);

  return records;
}

export type SortDirection = "asc" | "desc";

/** Sorts by one column, blanks last in both directions. */
export function sortReportRows(
  rows: readonly ReportRow[],
  column: ReportColumn,
  direction: SortDirection
): ReportRow[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = a.values[column.key] ?? "";
    const right = b.values[column.key] ?? "";
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    if (column.numeric) {
      const leftValue = Number(left);
      const rightValue = Number(right);
      const leftIsNumeric = Number.isFinite(leftValue);
      const rightIsNumeric = Number.isFinite(rightValue);
      if (leftIsNumeric && rightIsNumeric)
        return sign * (leftValue - rightValue);
      if (leftIsNumeric) return -1;
      if (rightIsNumeric) return 1;
    }

    return sign * left.localeCompare(right, undefined, { numeric: true });
  });
}
