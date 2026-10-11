import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface DatasetUploadRequest {
  formData: Record<string, unknown>;
}

export interface DatasetUploadResponse {
  message: string;
  success: boolean;
  s3Key?: string;
  s3Uri?: string;
}

export interface InteractionScreeningDatasetUploadRequest {
  runId: string;
  queryFastaS3Uri: string;
  targetFastaS3Uri: string;
}

export interface BulkPredictionDatasetUploadRequest {
  runId: string;
  fastaS3Uri: string;
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
