import { Request, Response } from "express";
import {
  WorkflowLaunchPayload,
  WorkflowLaunchResponse,
} from "../interfaces/workflow.interfaces.js";
import { launchSeqeraWorkflow } from "../services/launch.service.js";

/**
 * Launch a workflow on Seqera Platform
 */
export async function launchWorkflow(req: Request, res: Response) {
  try {
    const payload: WorkflowLaunchPayload = req.body;
    const { datasetId } = req.body; // Extract optional datasetId

    // Validate required fields
    if (!payload.launch) {
      return res.status(400).json({ error: "launch payload is required" });
    }

    if (!payload.launch.pipeline) {
      return res.status(400).json({ error: "pipeline is required" });
    }

    // Launch workflow via Seqera service
    const result = await launchSeqeraWorkflow(payload.launch, datasetId);

    const response: WorkflowLaunchResponse = {
      message: "Workflow launched successfully",
      runId: result.workflowId,
      status: result.status,
      submitTime: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Failed to launch workflow:", error);
    res.status(500).json({
      error: "Failed to launch workflow",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
