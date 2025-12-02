import { Router } from "express";
import { launchWorkflow } from "../controllers/launch-workflow.controller.js";
import { uploadDatasetController } from "../controllers/upload-dataset.controller.js";

const router = Router();

/**
 * POST /api/workflows/launch
 * Launch a workflow on Seqera Platform
 */
router.post("/launch", launchWorkflow);

/**
 * POST /api/workflows/datasets/upload
 * Upload dataset from form data as CSV to Seqera Platform
 */
router.post("/datasets/upload", uploadDatasetController);

export default router;
