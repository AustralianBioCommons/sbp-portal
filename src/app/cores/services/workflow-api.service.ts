import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  WorkflowLaunchForm,
  WorkflowLaunchPayload,
  WorkflowLaunchResponse,
} from "../interfaces/workflow.interfaces";
import { environment } from "../../../environments/environment";

/**
 * Angular service for Seqera Platform workflow operations
 */
@Injectable({
  providedIn: "root",
})
export class WorkflowApiService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/workflows`;
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
}
