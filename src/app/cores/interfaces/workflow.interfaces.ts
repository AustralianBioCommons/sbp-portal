/**
 * Workflow form data
 */
export interface WorkflowLaunchForm {
  pipeline: string;
  revision?: string;
  configProfiles?: string[];
  runName?: string;
  paramsText?: string;
}

/**
 * Workflow launch payload
 */
export interface WorkflowLaunchPayload {
  launch: WorkflowLaunchForm;
  formData: Record<string, unknown>;
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
