import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  CancelWorkflowResponse,
  LaunchDetails,
  LaunchLogs,
  ListRunsResponse,
  WorkflowLaunchForm,
  WorkflowLaunchPayload,
  WorkflowLaunchResponse,
} from "../interfaces/workflow.interfaces";

/**
 * Angular service for Seqera Platform workflow operations
 */
@Injectable({
  providedIn: "root",
})
export class WorkflowApiService {
  private readonly apiUrl = "http://localhost:3000/api/workflows";
  private http = inject(HttpClient);

  /**
   * Launch a new workflow
   * @param form - Workflow launch form data
   * @param datasetId - Optional dataset ID to attach to the workflow
   */
  launchWorkflow(
    form: WorkflowLaunchForm,
    datasetId?: string
  ): Observable<WorkflowLaunchResponse> {
    const payload: WorkflowLaunchPayload & { datasetId?: string } = {
      launch: form,
      ...(datasetId && { datasetId }),
    };
    return this.http.post<WorkflowLaunchResponse>(
      `${this.apiUrl}/launch`,
      payload
    );
  }

  /**
   * Cancel a running workflow
   */
  cancelWorkflow(runId: string): Observable<CancelWorkflowResponse> {
    return this.http.post<CancelWorkflowResponse>(
      `${this.apiUrl}/${runId}/cancel`,
      {}
    );
  }

  /**
   * List workflow runs with pagination
   */
  listRuns(
    page: number = 1,
    pageSize: number = 20
  ): Observable<ListRunsResponse> {
    return this.http.get<ListRunsResponse>(`${this.apiUrl}/runs`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  /**
   * Get workflow logs
   */
  getLogs(runId: string): Observable<LaunchLogs> {
    return this.http.get<LaunchLogs>(`${this.apiUrl}/${runId}/logs`);
  }

  /**
   * Get workflow details
   */
  getDetails(runId: string): Observable<LaunchDetails> {
    return this.http.get<LaunchDetails>(`${this.apiUrl}/${runId}/details`);
  }
}
