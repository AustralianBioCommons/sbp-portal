/**
 * Form data for launching a workflow
 */
export interface WorkflowLaunchForm {
  pipeline: string;
  workspaceId: string;
  computeEnvId: string;
  workDir: string;
  runName: string;
  revision: string;
  configProfiles: string[];
  paramsText: string;
  preRunScript: string;
  resume: boolean;
}

/**
 * Request payload for launching a workflow
 */
export interface WorkflowLaunchPayload {
  launch: WorkflowLaunchForm;
}

/**
 * Response from launching a workflow
 */
export interface WorkflowLaunchResponse {
  message: string;
  runId: string;
  status: string;
  workspaceId?: string;
  submitTime?: string;
}

/**
 * Request with runId parameter (used for cancel, logs, details)
 */
export interface RunIdRequest {
  runId: string;
}

/**
 * Response from cancelling a workflow
 */
export interface CancelWorkflowResponse {
  message: string;
  runId: string;
  status: string;
}

/**
 * Query parameters for listing workflow runs
 */
export interface ListRunsQuery {
  status?: string;
  workspace?: string;
  limit?: number;
  offset?: number;
}

/**
 * Individual workflow run item in list response
 */
export interface RunInfo {
  id: string;
  run: string;
  workflow: string;
  status:
    | "SUBMITTED"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "UNKNOWN";
  date: string;
  cancel: string;
}

/**
 * Response from listing workflow runs
 */
export interface ListRunsResponse {
  runs: RunInfo[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Individual log entry
 */
export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source?: string;
}

/**
 * Response from getting workflow logs
 */
export interface LaunchLogs {
  truncated: boolean;
  entries: string[];
  rewindToken: string;
  forwardToken: string;
  pending: boolean;
  message: string;
  downloads?: Array<{
    saveName: string;
    fileName: string;
    displayText: string;
  }>;
}

/**
 * Detailed workflow run information
 */
export interface LaunchDetails {
  requiresAttention: boolean;
  status:
    | "SUBMITTED"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "UNKNOWN";
  ownerId: number;
  repository: string;
  id: string;
  submit: string;
  start: string;
  complete: string;
  dateCreated: string;
  lastUpdated: string;
  runName: string;
  sessionId: string;
  profile: string;
  workDir: string;
  commitId: string;
  userName: string;
  scriptId: string;
  revision: string;
  commandLine: string;
  projectName: string;
  scriptName: string;
  launchId: string;
  configFiles: string[];
  params: Record<string, string>;
}
