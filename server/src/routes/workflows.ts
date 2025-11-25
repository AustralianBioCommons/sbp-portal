import { Router } from "express";
import { cancelWorkflow } from "../controllers/cancel-workflow.controller.js";
import { getDetails } from "../controllers/get-details.controller.js";
import { getLogs } from "../controllers/get-logs.controller.js";
import { launchWorkflow } from "../controllers/launch-workflow.controller.js";
import { listRuns } from "../controllers/list-runs.controller.js";

const router = Router();

/**
 * POST /api/workflows/launch
 * Launch a workflow on Seqera Platform
 */
router.post("/launch", launchWorkflow);

/**
 * POST /api/workflows/:runId/cancel
 * Cancel a running workflow
 */
router.post("/:runId/cancel", cancelWorkflow);

/**
 * GET /api/workflows/runs
 * List all workflow runs with optional filters
 */
router.get("/runs", listRuns);

/**
 * GET /api/workflows/:runId/logs
 * Get logs for a specific workflow run
 */
router.get("/:runId/logs", getLogs);

/**
 * GET /api/workflows/:runId/details
 * Get detailed information about a workflow run
 */
router.get("/:runId/details", getDetails);

export default router;
