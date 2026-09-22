import {
  ReportColumn,
  ReportRow,
  JobResultsAdapter,
  parseCsvTable,
  NO_PREDICTIONS_MESSAGE,
  registerJobResultsAdapter,
} from "./job-results-report.utils";
import { ResultFileRef } from "./prediction-results.utils";
import {
  BOLTZ_LAYOUT,
  COLABFOLD_LAYOUT,
  StructureLayout,
  WISPS_RESULTS_SUFFIX,
  findWispsScoresArtifact,
  findWispsStructures,
} from "./wisps-results.utils";

const WORKFLOW = "bulk prediction";

/** Split out of the submitted id, not read from the file. */
const QUERY_KEY = "queryId";
const TARGET_KEY = "targetId";

const BULK_COLUMNS: readonly ReportColumn[] = [
  { key: QUERY_KEY, heading: "Query ID", emphasised: true },
  { key: TARGET_KEY, heading: "Target ID" },
  { key: "ptm", heading: "pTM", numeric: true, higherIsBetter: true },
];

/** Manual mode has no query/target grid to read a boundary off, so the first hyphen is it. */
export function splitBulkId(id: string): { query: string; target: string } {
  const boundary = id.indexOf("-");
  if (boundary < 0) return { query: id, target: "" };
  return { query: id.slice(0, boundary), target: id.slice(boundary + 1) };
}

export function parseBulkPredictionRows(
  text: string,
  files: readonly ResultFileRef[],
  layout: StructureLayout
): ReportRow[] {
  const { rows } = parseCsvTable(text);
  const structures = findWispsStructures(files, layout);

  const reportRows: ReportRow[] = [];

  for (const row of rows) {
    const id = (row["id"] ?? "").trim();
    const structure = structures.get(id);
    if (!id || !structure) continue;

    const { query, target } = splitBulkId(id);

    reportRows.push({
      id,
      label: id,
      values: { ...row, [QUERY_KEY]: query, [TARGET_KEY]: target },
      structure: {
        key: structure.key,
        label: structure.label,
        format: layout.format,
      },
    });
  }

  return reportRows;
}

function bulkPredictionAdapter(
  tool: string,
  layout: StructureLayout
): JobResultsAdapter {
  return {
    workflow: WORKFLOW,
    tool,
    columns: BULK_COLUMNS,
    resultsFileName: WISPS_RESULTS_SUFFIX,
    primaryChainId: "A",
    panelHeading: "Predictions",
    emptyMessage: NO_PREDICTIONS_MESSAGE,
    colorTheme: "plddt",
    // The pLDDT key replaces a per-chain one.
    legend: [],
    // Each row is a different molecule.
    superpose: false,
    findResultsArtifact: findWispsScoresArtifact,
    parseRows: (text, files) => parseBulkPredictionRows(text, files, layout),
  };
}

export const bulkPredictionBoltzAdapter = bulkPredictionAdapter(
  "boltz",
  BOLTZ_LAYOUT
);
export const bulkPredictionColabFoldAdapter = bulkPredictionAdapter(
  "colabfold",
  COLABFOLD_LAYOUT
);

registerJobResultsAdapter(bulkPredictionBoltzAdapter);
registerJobResultsAdapter(bulkPredictionColabFoldAdapter);
