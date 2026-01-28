import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface PdbUploadRequest {
  file: File;
  metadata?: Record<string, unknown>;
}

export interface PdbUploadResponse {
  message: string;
  success: boolean;
  fileId: string;
  fileName: string;
  s3Uri: string;
  fileUrl?: string;
  details?: unknown;
}

@Injectable({
  providedIn: "root",
})
export class PdbUploadService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/workflows/pdb`;

  /**
   * Upload PDB file to the backend API
   */
  uploadPdbFile(request: PdbUploadRequest): Observable<PdbUploadResponse> {
    const formData = new FormData();
    formData.append("file", request.file);

    if (request.metadata) {
      formData.append("metadata", JSON.stringify(request.metadata));
    }

    return this.http.post<PdbUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Validate PDB file before upload
   */
  validatePdbFile(file: File): { valid: boolean; error?: string } {
    // Check file extension
    if (!file.name.toLowerCase().endsWith(".pdb")) {
      return { valid: false, error: "File must have .pdb extension" };
    }

    // Check file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: "File size exceeds 10MB limit" };
    }

    return { valid: true };
  }
}
