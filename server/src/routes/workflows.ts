import { Router } from "express";
import { launchWorkflow } from "../controllers/launch-workflow.controller.js";

const router = Router();

/**
 * POST /api/workflows/launch
 * Launch a workflow on Seqera Platform
 */
router.post("/launch", launchWorkflow);

export default router;
