import { Request, Response } from "express";
import { LaunchDetails } from "../interfaces/workflow.interfaces.js";

/**
 * Get detailed information about a workflow run
 */
export async function getDetails(req: Request, res: Response) {
  try {
    const { runId } = req.params;

    // TODO: Implement details retrieval via Seqera API
    // const details = await getSeqeraRunDetails(runId);

    const response: LaunchDetails = {
      requiresAttention: false,
      status: "UNKNOWN",
      ownerId: 0,
      repository: "",
      id: runId,
      submit: "",
      start: "",
      complete: "",
      dateCreated: "",
      lastUpdated: "",
      runName: "",
      sessionId: "",
      profile: "",
      workDir: "",
      commitId: "",
      userName: "",
      scriptId: "",
      revision: "",
      commandLine: "",
      projectName: "",
      scriptName: "",
      launchId: "",
      configFiles: [],
      params: {},
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to get workflow details:", error);
    res.status(500).json({
      error: "Failed to get workflow details",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
