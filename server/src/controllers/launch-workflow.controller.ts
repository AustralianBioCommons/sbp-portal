import { Request, Response } from "express";
import {
  WorkflowLaunchPayload,
  WorkflowLaunchResponse,
} from "../interfaces/workflow.interfaces.js";

/**
 * Launch a workflow on Seqera Platform
 */
export async function launchWorkflow(req: Request, res: Response) {
  try {
    const payload: WorkflowLaunchPayload = req.body;

    // Validate required fields
    if (!payload.launch) {
      return res.status(400).json({ error: "launch payload is required" });
    }

    if (!payload.launch.pipeline) {
      return res.status(400).json({ error: "pipeline is required" });
    }

    if (!payload.launch.workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    // TODO: Import and call launchSeqeraWorkflow from services
    // const result = await launchSeqeraWorkflow(payload);

    // Placeholder response
    const response: WorkflowLaunchResponse = {
      message: "Workflow launched successfully",
      runId: "mock-run-id-123",
      status: "submitted",
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
