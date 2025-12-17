import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface DatasetUploadRequest {
  formData: Record<string, unknown>;
  datasetName?: string;
  datasetDescription?: string;
}

export interface DatasetUploadResponse {
  message: string;
  success: boolean;
  datasetId?: string;
  details?: unknown;
}

@Injectable({
  providedIn: "root",
})
export class DatasetUploadService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/workflows/datasets`;

  /**
   * Upload dataset to the Seqera Platform via backend API
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
