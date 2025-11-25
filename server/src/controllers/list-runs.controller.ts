import { Request, Response } from "express";
import {
  ListRunsQuery,
  ListRunsResponse,
} from "../interfaces/workflow.interfaces.js";

/**
 * List all workflow runs with optional filters
 */
export async function listRuns(req: Request, res: Response) {
  try {
    const { status, workspace, limit = "50", offset = "0" } = req.query;

    const query: ListRunsQuery = {
      status: status as string | undefined,
      workspace: workspace as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    // TODO: Implement list runs via Seqera API
    // const runs = await listSeqeraRuns(query);

    const response: ListRunsResponse = {
      runs: [],
      total: 0,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to list workflow runs:", error);
    res.status(500).json({
      error: "Failed to list workflow runs",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
