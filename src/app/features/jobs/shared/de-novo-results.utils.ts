/**
 * The workflow-agnostic half of the de novo design report. A new workflow is
 * added by writing an adapter and registering it.
 */

import { ResultFileRef, StructureFormat } from "./prediction-results.utils";

/** One column of the results table, in display order. */
export interface DesignColumn {
  /** Key into `DesignRow.values`, normally the source file's column name. */
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

/** The structure a design was written to, ready for the viewer. */
export interface DesignStructure {
  key: string;
  label: string;
  format: StructureFormat;
}

/** One design: the cells to show plus the structure the viewer loads for it. */
export interface DesignRow {
  /** Stable across re-sorts and re-pages; used for tracking and selection. */
  id: string;
  /** How the design is named outside the table, e.g. above the viewer. */
  label: string;
  values: Record<string, string>;
  /** Null when no structure could be matched to this design. */
  structure: DesignStructure | null;
}

/** What one workflow contributes: its table, and how a row finds a structure. */
export interface DeNovoDesignAdapter {
  /** Lower-case tool id, as the job's `tool` field reports it. */
  tool: string;
  columns: readonly DesignColumn[];
  /** Names the results file in the empty state, e.g. "_final_design_stats.csv". */
  resultsFileName: string;
  /** The run's results table, or null when it has not produced one. */
  findResultsArtifact(files: readonly ResultFileRef[]): ResultFileRef | null;
  /** Rows in file order, each paired with its structure. */
  parseRows(text: string, files: readonly ResultFileRef[]): DesignRow[];
}

const adapters = new Map<string, DeNovoDesignAdapter>();

/** Called once per workflow, from that workflow's module. */
export function registerDeNovoDesignAdapter(
  adapter: DeNovoDesignAdapter
): void {
  adapters.set(adapter.tool, adapter);
}

/** Null for a de novo workflow the report cannot render yet, e.g. RFdiffusion. */
export function getDeNovoDesignAdapter(
  tool: string | null | undefined
): DeNovoDesignAdapter | null {
  return adapters.get((tool ?? "").trim().toLowerCase()) ?? null;
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
export function sortDesignRows(
  rows: readonly DesignRow[],
  column: DesignColumn,
  direction: SortDirection
): DesignRow[] {
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
      if (Number.isFinite(leftValue) && Number.isFinite(rightValue)) {
        return sign * (leftValue - rightValue);
      }
    }

    return sign * left.localeCompare(right, undefined, { numeric: true });
  });
}
