import { Request, Response } from "express";
import { CancelWorkflowResponse } from "../interfaces/workflow.interfaces.js";

/**
 * Cancel a running workflow
 */
export async function cancelWorkflow(req: Request, res: Response) {
  try {
    const { runId } = req.params;

    // TODO: Implement cancel via Seqera API
    // await cancelSeqeraWorkflow(runId);

    const response: CancelWorkflowResponse = {
      message: "Workflow cancelled successfully",
      runId,
      status: "cancelled",
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to cancel workflow:", error);
    res.status(500).json({
      error: "Failed to cancel workflow",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
