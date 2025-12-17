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
   * @param launch - Workflow launch configuration
   * @param formData - Form data to be passed to the workflow
   * @param datasetId - Optional dataset ID to attach to the workflow
   */
  launchWorkflow(
    launch: {
      pipeline: string;
      revision?: string;
      configProfiles?: string[];
      runName?: string;
      paramsText?: string | null;
    },
    formData: Record<string, unknown>,
    datasetId?: string
  ): Observable<WorkflowLaunchResponse> {
    const payload: WorkflowLaunchPayload & { datasetId?: string } = {
      launch,
      formData,
      ...(datasetId && { datasetId }),
    };
    return this.http.post<WorkflowLaunchResponse>(
      `${this.apiUrl}/launch`,
      payload
    );
  }
}
