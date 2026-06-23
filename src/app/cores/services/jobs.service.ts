import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { environment } from "../../../environments/environment";

/**
 * Individual job item in the job listing
 */
export interface JobListItem {
  id: string;
  jobName: string;
  workflow: string;
  tool: string;
  status: string;
  submittedAt: string;
  score: number | null;
  finalDesignCount?: number | null;
}

/**
 * Paginated response for job listing
 */
export interface JobListResponse {
  jobs: JobListItem[];
  total: number;
  limit: number;
  offset: number;
  seqeraUnavailable?: boolean;
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

export interface CancelJobResponse {
  message: string;
  runId: string;
  status: string;
}

export interface DeleteJobResponse {
  runId: string;
  deleted: boolean;
  cancelledBeforeDelete: boolean;
  message: string;
}

export interface BulkDeleteJobsResponse {
  deleted: string[];
  failed: Record<string, string>;
}

/**
 * Service for fetching workflow jobs from the backend API
 */
@Injectable({
  providedIn: "root",
})
export class JobsService {
  private readonly jobsUrl = `${environment.apiBaseUrl}/api/jobs`;
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

    return this.http.get<JobListResponse>(this.jobsUrl, { params: httpParams });
  }

  /**
   * Fetch a single job by its run id.
   *
   * There is no dedicated single-job endpoint, so this resolves the job from
   * the job listing. Used when the job detail page is reached directly via URL
   * (e.g. on refresh) and no job was passed through router navigation state.
   * @param runId The job run id
   * @returns Observable of the matching JobListItem, or null if not found
   */
  getJob(
    runId: string
  ): Observable<{ job: JobListItem | null; seqeraUnavailable: boolean }> {
    return this.listJobs({ limit: 1000, offset: 0 }).pipe(
      map((response) => {
        const job = response.jobs.find((item) => item.id === runId);
        return {
          job: job ? this.normalizeJob(job) : null,
          seqeraUnavailable: response.seqeraUnavailable ?? false,
        };
      })
    );
  }

  /**
   * Normalize a raw job payload, accounting for snake_case API field aliases.
   */
  normalizeJob(job: JobListItem): JobListItem {
    const rawJob = job as JobListItem & {
      final_design_count?: number | null;
      workflow_name?: string | null;
    };
    return {
      ...job,
      finalDesignCount:
        rawJob.finalDesignCount ?? rawJob.final_design_count ?? null,
      workflow: rawJob.workflow ?? rawJob.workflow_name ?? "",
    };
  }

  cancelJob(runId: string): Observable<CancelJobResponse> {
    return this.http.post<CancelJobResponse>(
      `${this.jobsUrl}/${encodeURIComponent(runId)}/cancel`,
      {}
    );
  }

  deleteJob(runId: string): Observable<DeleteJobResponse> {
    return this.http.delete<DeleteJobResponse>(
      `${this.jobsUrl}/${encodeURIComponent(runId)}`
    );
  }

  bulkDeleteJobs(runIds: string[]): Observable<BulkDeleteJobsResponse> {
    return this.http.post<BulkDeleteJobsResponse>(
      `${this.jobsUrl}/bulk-delete`,
      { runIds }
    );
  }
}
