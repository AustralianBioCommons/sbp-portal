export type WorkflowName =
  | "single-prediction"
  | "de-novo-design"
  | "interaction-screening"
  | "bulk-prediction";
export type WorkflowTool =
  | "alphafold2"
  | "bindcraft"
  | "boltz"
  | "boltzgen"
  | "colabfold"
  | "rfdiffusion";

/**
 * Workflow form data
 */
export interface WorkflowLaunchForm {
  workflow: WorkflowName;
  tool: WorkflowTool;
  configProfiles?: string[];
  runName?: string;
  paramsText?: string | null;
}

/**
 * Workflow launch payload
 */
export interface WorkflowLaunchPayload {
  launch: WorkflowLaunchForm;
  datasetId: string;
  formData: WorkflowFormData;
}

/**
 * Workflow launch response
 */
export interface WorkflowLaunchResponse {
  message: string;
  runId: string;
  status: string;
  submitTime: string;
}

/**
 * Workflow run information
 */
export interface RunInfo {
  runId: string;
  runName: string;
  status: "SUBMITTED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  workflowId: string;
  submitTime: string;
  startTime?: string;
  completeTime?: string;
}

export interface EntityRow {
  id: string;
  moleculeType: string;
  copyNumber: number;
  sequence: string;
}

export interface DefaultWorkflowPayload {
  workflow: WorkflowName;
  tool: WorkflowTool;
  runName: string;
  configProfiles?: string[];
  sample_id: string;
}

export interface InteractionScreeningPayload extends DefaultWorkflowPayload {
  fastaS3Uri: string;
  splitOutputDir: string;
}

// No extra fields currently required for bulk prediction
export type BulkPredictionPayload = DefaultWorkflowPayload;

export interface SinglePredictionPayload extends DefaultWorkflowPayload {
  entities: EntityRow[];
  fastaContent: string;
  fastaFileUrl: string;
  alphafold2_random_seed?: number;
  alphafold2_full_dbs?: boolean;
  colabfold_num_recycles?: number;
  colabfold_use_templates?: boolean;
  boltz_use_potentials?: boolean;
}

export type SinglePredictionToolSettingsPayload = Partial<
  Pick<
    SinglePredictionPayload,
    | "alphafold2_random_seed"
    | "alphafold2_full_dbs"
    | "colabfold_num_recycles"
    | "colabfold_use_templates"
    | "boltz_use_potentials"
  >
>;

// de novo design payload includes fields that are loaded from the schema dynamically,
// can't be specified fully
export interface DeNovoDesignPayload
  extends DefaultWorkflowPayload,
    Record<string, unknown> {
  id: string;
  binder_name: string;
}

export type WorkflowFormData =
  | SinglePredictionPayload
  | DeNovoDesignPayload
  | InteractionScreeningPayload
  | BulkPredictionPayload;

/**
 * List runs response
 */
export interface ListRunsResponse {
  runs: RunInfo[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Workflow logs response
 */
export interface LaunchLogs {
  runId: string;
  logs: string;
  lastUpdated: string;
}

/**
 * Workflow details response
 */
export interface LaunchDetails {
  runId: string;
  runName: string;
  status: string;
  workflowId: string;
  pipeline: string;
  revision?: string;
  configProfiles?: string[];
  workDir?: string;
  computeEnv?: string;
  submitTime: string;
  startTime?: string;
  completeTime?: string;
  duration?: string;
  exitStatus?: number;
  errorMessage?: string;
  params?: Record<string, unknown>;
}

/**
 * Cancel workflow response
 */
export interface CancelWorkflowResponse {
  message: string;
  runId: string;
  status: string;
}
