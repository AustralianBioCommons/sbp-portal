import { Request, Response } from "express";
import {
  createDataset,
  uploadDatasetToSeqera,
} from "../services/dataset.service.js";

/**
 * Upload dataset from form data to Seqera Platform
 * POST /api/workflows/datasets/upload
 *
 * This endpoint:
 * 1. Creates a new dataset on Seqera Platform
 * 2. Uploads the CSV data to that dataset
 *
 * Request body:
 * {
 *   formData: Record<string, unknown>;
 *   datasetName?: string; // Optional dataset name
 *   datasetDescription?: string; // Optional dataset description
 * }
 */
export async function uploadDatasetController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { formData, datasetName, datasetDescription } = req.body;

    console.log("Received request body:", {
      hasFormData: !!formData,
      formDataKeys: formData ? Object.keys(formData) : [],
      datasetName,
      datasetDescription,
    });

    // Validate required fields
    if (!formData) {
      res.status(400).json({
        error: "Missing required field: formData is required",
      });
      return;
    }

    // Step 1: Create a new dataset
    console.log("Creating dataset with name:", datasetName || "placeholder");
    const createResult = await createDataset(datasetName, datasetDescription);

    const datasetId = createResult.dataset.id;
    console.log("Dataset created with ID:", datasetId);

    // Wait a moment for the dataset to be fully initialized on Seqera's side
    console.log("Waiting 2 seconds for dataset initialization...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Upload CSV data to the created dataset
    console.log("Uploading data to dataset...");
    const uploadResult = await uploadDatasetToSeqera(datasetId, formData);

    console.log("Dataset uploaded successfully:", uploadResult);

    res.status(200).json({
      message: "Dataset created and uploaded successfully",
      datasetId,
      ...uploadResult,
    });
  } catch (error) {
    console.error("Error uploading dataset:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
