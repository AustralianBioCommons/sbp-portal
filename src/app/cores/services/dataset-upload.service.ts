import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface DatasetUploadRequest {
  formData: Record<string, unknown>;
}

export interface DatasetUploadResponse {
  message: string;
  success: boolean;
  datasetId?: string;
  splitOutputDir?: string;
  details?: unknown;
}

export interface InteractionScreeningDatasetUploadRequest {
  sequences: { id: string; group: "query" | "target" }[];
  runId: string;
}

export interface BulkPredictionDatasetUploadRequest {
  sequences: { id: string; sequence: string }[];
  runId: string;
}

@Injectable({
  providedIn: "root",
})
export class DatasetUploadService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/workflows/datasets`;

  uploadDataset(
    request: DatasetUploadRequest
  ): Observable<DatasetUploadResponse> {
    return this.http.post<DatasetUploadResponse>(
      `${this.apiUrl}/upload`,
      request
    );
  }

  uploadInteractionScreeningDataset(
    request: InteractionScreeningDatasetUploadRequest
  ): Observable<DatasetUploadResponse> {
    return this.http.post<DatasetUploadResponse>(
      `${this.apiUrl}/interaction-screening/upload`,
      request
    );
  }

  uploadBulkPredictionDataset(
    request: BulkPredictionDatasetUploadRequest
  ): Observable<DatasetUploadResponse> {
    return this.http.post<DatasetUploadResponse>(
      `${this.apiUrl}/bulk-prediction/upload`,
      request
    );
  }
}
