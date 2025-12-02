import {
  CreateDatasetResponse,
  DatasetUploadResponse,
} from "../interfaces/workflow.interfaces.js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Convert form data object to CSV string
 * @param data - Object with key-value pairs to convert to CSV
 * @returns CSV formatted string
 */
function convertFormDataToCSV(data: Record<string, unknown>): string {
  // Extract headers (keys) from the data object
  const headers = Object.keys(data);

  // Extract values
  const values = Object.values(data).map((value) => {
    // Handle different data types
    if (value === null || value === undefined) {
      return "";
    }

    // Convert arrays to semicolon-separated string
    if (Array.isArray(value)) {
      return value.join(";");
    }

    // Convert objects to JSON string
    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    const stringValue = String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes("\n") ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  });

  // Combine headers and values into CSV format
  const csvRows = [headers.join(","), values.join(",")];

  return csvRows.join("\n");
}

/**
 * Create a new dataset on Seqera Platform
 * @param name - Dataset name (will be made unique with timestamp if not provided)
 * @param description - Dataset description
 * @returns The created dataset information including ID
 */
export async function createDataset(
  name?: string,
  description: string = "Dataset for workflow submission"
): Promise<CreateDatasetResponse> {
  // Generate unique name if not provided
  const datasetName = name || `dataset-${Date.now()}`;
  const SEQERA_API_URL = getRequiredEnv("SEQERA_API_URL");
  const SEQERA_TOKEN = getRequiredEnv("SEQERA_ACCESS_TOKEN");
  const workspaceId = getRequiredEnv("WORK_SPACE");

  const url = `${SEQERA_API_URL}/workspaces/${workspaceId}/datasets/`;

  console.log("Creating dataset:", {
    url,
    workspaceId,
    name: datasetName,
    description,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SEQERA_TOKEN}`,
    },
    body: JSON.stringify({
      name: datasetName,
      description,
    }),
  });

  console.log("Seqera API create dataset response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Seqera API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(
      `Seqera dataset creation failed: ${response.status} ${errorText}`
    );
  }

  const data = (await response.json()) as CreateDatasetResponse;
  console.log("Dataset created successfully:", data.dataset.id);

  return data;
}

/**
 * Upload dataset from form data to Seqera Platform
 * @param datasetId - The dataset ID to upload to
 * @param formData - The form data to convert to CSV and upload
 */
export async function uploadDatasetToSeqera(
  datasetId: string,
  formData: Record<string, unknown>
): Promise<DatasetUploadResponse> {
  const SEQERA_API_URL = getRequiredEnv("SEQERA_API_URL");
  const SEQERA_TOKEN = getRequiredEnv("SEQERA_ACCESS_TOKEN");
  const workspaceId = getRequiredEnv("WORK_SPACE");

  // Log the incoming form data
  console.log("Form data to convert:", JSON.stringify(formData, null, 2));

  // Convert form data to CSV
  const csvString = convertFormDataToCSV(formData);
  console.log("Generated CSV:");
  console.log(csvString);
  console.log("CSV length:", csvString.length);

  // Create form data for upload using form-data package
  const FormData = (await import("form-data")).default;
  const form = new FormData();

  // Create a buffer from CSV string
  const csvBuffer = Buffer.from(csvString, "utf-8");

  // Append the file
  form.append("file", csvBuffer, {
    filename: "samplesheet.csv",
    contentType: "text/csv",
  });

  // Upload to Seqera API
  const url = `${SEQERA_API_URL}/workspaces/${workspaceId}/datasets/${datasetId}/upload`;

  console.log("Uploading dataset:", {
    url,
    workspaceId,
    datasetId,
    csvPreview: csvString.substring(0, 200),
  });

  try {
    // Use axios instead of fetch for better form-data support
    const axios = (await import("axios")).default;
    
    const response = await axios.post(url, form, {
      headers: {
        Authorization: `Bearer ${SEQERA_TOKEN}`,
        Accept: "application/json",
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log("Seqera API response status:", response.status);
    console.log("Response data:", response.data);

    console.log("Seqera API response status:", response.status);
    console.log("Response data:", response.data);

    return {
      success: true,
      datasetId: response.data.version?.datasetId || datasetId,
      message: "Upload successful",
    };
  } catch (error: any) {
    console.error("Upload error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(
      `Seqera dataset upload failed: ${error.response?.status || "unknown"} ${
        JSON.stringify(error.response?.data) || error.message
      }`
    );
  }
}
