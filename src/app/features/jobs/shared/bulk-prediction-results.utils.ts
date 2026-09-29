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

const PLDDT_KEY = "plddt";

const BULK_COLUMNS: readonly ReportColumn[] = [
  // The submitted FASTA header, whole.
  { key: "id", heading: "Query ID", emphasised: true },
  { key: "ptm", heading: "pTM", numeric: true, higherIsBetter: true },
  { key: PLDDT_KEY, heading: "pLDDT", numeric: true, higherIsBetter: true },
];

/** ColabFold writes pLDDT on 0–100 and Boltz on 0–1; both come out on 0–100. */
export function derivePlddt(row: Readonly<Record<string, string>>): string {
  const plddt = row["plddt"]?.trim();
  if (plddt) return plddt;

  const complex = row["complex_plddt"]?.trim();
  const value = Number(complex);
  return complex && Number.isFinite(value) ? String(value * 100) : "";
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

    reportRows.push({
      id,
      label: id,
      values: { ...row, [PLDDT_KEY]: derivePlddt(row) },
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
