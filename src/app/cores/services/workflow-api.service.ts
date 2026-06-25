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
   * @param s3InputKey - S3 object key for the input samplesheet CSV
   */
  launchWorkflow(
    launch: WorkflowLaunchForm,
    formData: WorkflowLaunchPayload["formData"],
    s3InputKey: string
  ): Observable<WorkflowLaunchResponse> {
    const payload: WorkflowLaunchPayload = {
      launch,
      s3InputKey,
      formData,
    };
    return this.http.post<WorkflowLaunchResponse>(
      `${this.apiUrl}/launch`,
      payload
    );
  }
}
