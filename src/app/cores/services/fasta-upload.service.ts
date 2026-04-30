import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface FastaUploadRequest {
  file: File;
}

export interface FastaUploadResponse {
  message: string;
  success: boolean;
  fileId: string;
  fileName: string;
  s3Uri: string;
  presignedUrl: string;
  details?: unknown;
}

@Injectable({
  providedIn: "root",
})
export class FastaUploadService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/workflows/fasta`;

  uploadFastaFile(
    request: FastaUploadRequest
  ): Observable<FastaUploadResponse> {
    const formData = new FormData();
    formData.append("file", request.file);

    return this.http.post<FastaUploadResponse>(
      `${this.apiUrl}/upload`,
      formData
    );
  }
}
