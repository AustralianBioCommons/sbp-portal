import { WorkflowLaunchForm } from "../interfaces/workflow.interfaces.js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export interface SeqeraLaunchResponse {
  workflowId: string;
  status: string;
  message?: string;
}

/**
 * Launch a workflow on Seqera Platform
 * @param form - Workflow launch form data
 * @param datasetId - Optional dataset ID to attach to the workflow
 */
export async function launchSeqeraWorkflow(
  form: WorkflowLaunchForm,
  datasetId?: string
): Promise<SeqeraLaunchResponse> {
  // Get environment variables at runtime, not module load time
  const SEQERA_API_URL = getRequiredEnv("SEQERA_API_URL");
  const SEQERA_TOKEN = getRequiredEnv("SEQERA_ACCESS_TOKEN");
  const WORKSPACE_ID = getRequiredEnv("WORK_SPACE");
  const COMPUTE_ENV_ID = getRequiredEnv("COMPUTE_ID");
  const WORK_DIR = getRequiredEnv("WORK_DIR");

  // Construct payload matching working Next.js implementation
  const launchPayload = {
    launch: {
      computeEnvId: COMPUTE_ENV_ID,
      runName: form.runName || "hello-from-ui",
      pipeline: form.pipeline || "https://github.com/nextflow-io/hello",
      workDir: WORK_DIR,
      workspaceId: WORKSPACE_ID,
      revision: form.revision || "main",
      paramsText: form.paramsText || "",
      configProfiles: form.configProfiles || [],
      preRunScript: "module load nextflow",
      resume: false,
      ...(datasetId && { datasetIds: [datasetId] }),
    },
  };

  console.log("Launching workflow:", {
    url: `${SEQERA_API_URL}/workflow/launch?workspaceId=${WORKSPACE_ID}`,
    workspaceId: WORKSPACE_ID,
    computeEnvId: COMPUTE_ENV_ID,
    pipeline: launchPayload.launch.pipeline,
    runName: launchPayload.launch.runName,
  });

  const response = await fetch(
    `${SEQERA_API_URL}/workflow/launch?workspaceId=${WORKSPACE_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SEQERA_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(launchPayload),
    }
  );

  console.log("Seqera API response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Seqera API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(
      `Seqera workflow launch failed: ${response.status} ${errorText}`
    );
  }

  const data = (await response.json()) as {
    workflowId?: string;
    data?: { workflowId?: string };
    status?: string;
    message?: string;
  };

  return {
    workflowId: data.workflowId || data.data?.workflowId || "",
    status: data.status || "submitted",
    message: data.message,
  };
}
