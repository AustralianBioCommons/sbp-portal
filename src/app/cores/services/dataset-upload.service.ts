import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface DatasetUploadRequest {
  formData: Record<string, unknown>;
}

export interface DatasetUploadResponse {
  message: string;
  success: boolean;
  datasetId?: string;
}

@Injectable({
  providedIn: "root",
})
export class DatasetUploadService {
  private http = inject(HttpClient);
  private apiUrl = "http://localhost:3000/api/workflows/datasets";

  /**
   * Upload dataset to Seqera Platform
   * @param request - Dataset upload request with workspaceId, datasetId, and formData
   * @returns Observable of upload response
   */
  uploadDataset(
    request: DatasetUploadRequest
  ): Observable<DatasetUploadResponse> {
    return this.http.post<DatasetUploadResponse>(
      `${this.apiUrl}/upload`,
      request
    );
  }
}
