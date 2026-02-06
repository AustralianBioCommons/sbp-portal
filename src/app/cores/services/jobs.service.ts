import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

/**
 * Individual job item in the job listing
 */
export interface JobListItem {
  id: string;
  jobName: string;
  workflowType: string | null;
  status: string;
  submittedAt: string;
  score: number | null;
}

/**
 * Paginated response for job listing
 */
export interface JobListResponse {
  jobs: JobListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Query parameters for job listing
 */
export interface JobListQueryParams {
  search?: string;
  status?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Service for fetching workflow jobs from the backend API
 */
@Injectable({
  providedIn: "root",
})
export class JobsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/workflows/jobs`;
  private http = inject(HttpClient);

  /**
   * Fetch paginated list of jobs with optional search and filters
   * @param params Query parameters for filtering and pagination
   * @returns Observable of JobListResponse
   */
  listJobs(params?: JobListQueryParams): Observable<JobListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.search) {
        httpParams = httpParams.set("search", params.search);
      }
      if (params.status && params.status.length > 0) {
        params.status.forEach((s) => {
          httpParams = httpParams.append("status", s);
        });
      }
      if (params.limit !== undefined) {
        httpParams = httpParams.set("limit", params.limit.toString());
      }
      if (params.offset !== undefined) {
        httpParams = httpParams.set("offset", params.offset.toString());
      }
    }

    return this.http.get<JobListResponse>(this.apiUrl, { params: httpParams });
  }
}
