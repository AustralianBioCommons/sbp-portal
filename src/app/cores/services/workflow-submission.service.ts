import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { getErrorMessage } from "../utils/error.utils";
import { WorkflowApiService } from "./workflow-api.service";
import {
  WorkflowFormData,
  WorkflowLaunchForm,
} from "../interfaces/workflow.interfaces";

@Injectable({
  providedIn: "root",
})
export class WorkflowSubmissionService {
  private workflowApiService = inject(WorkflowApiService);
  private router = inject(Router);

  // Success dialog state
  showSuccessDialog = signal<boolean>(false);
  successDialogData = signal<{ runId: string; status: string } | null>(null);
  // Loading state during submission
  isSubmitting = signal<boolean>(false);

  /**
   * Submit workflow with form data and optional dataset ID
   * @param formData - The form data to submit
   * @param datasetId - Optional dataset ID to attach to the workflow
   * @param onError - Optional error handler
   */
  submitWorkflowWithDataset(
    formData: WorkflowFormData,
    datasetId?: string,
    onError?: (error: Error) => void
  ): void {
    // Generate a random run name with timestamp and random string
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const randomRunName = `run-${timestamp}-${randomStr}`;

    // Construct the launch configuration
    const launch: WorkflowLaunchForm = {
      workflow: formData.workflow,
      tool: formData.tool,
      configProfiles: formData.configProfiles ?? ["singularity"],
      runName: formData.runName || randomRunName,
      paramsText: null,
    };

    console.log("Submitting workflow with launch config:", launch);
    console.log("Form data:", formData);
    if (datasetId) {
      console.log("With dataset ID:", datasetId);
    }

    const normalizedDatasetId = datasetId?.trim();
    if (!normalizedDatasetId) {
      const error = new Error("datasetId is required to launch workflow.");
      if (onError) {
        onError(error);
      } else {
        alert(`Failed to launch workflow: ${error.message}`);
      }
      return;
    }

    // Show loading state
    this.isSubmitting.set(true);

    // Call the API service with separate launch and formData
    this.workflowApiService
      .launchWorkflow(launch, formData, normalizedDatasetId)
      .subscribe({
        next: (response) => {
          console.log("Workflow launched successfully:", response);
          // Hide loading state
          this.isSubmitting.set(false);
          // Show success dialog instead of alert
          this.successDialogData.set({
            runId: response.runId,
            status: response.status,
          });
          this.showSuccessDialog.set(true);
        },
        error: (error) => {
          console.error("Error launching workflow:", error);
          this.isSubmitting.set(false);

          const message = getErrorMessage(error);

          if (onError) {
            onError(new Error(message));
          } else {
            alert(`Failed to launch workflow: ${message}`);
          }
        },
      });
  }

  /**
   * Navigate to home page
   */
  goToHome(): void {
    this.showSuccessDialog.set(false);
    this.router.navigate(["/"]);
  }

  /**
   * Navigate to jobs page
   */
  goToJobs(): void {
    this.showSuccessDialog.set(false);
    this.router.navigate(["/jobs"]);
  }

  /**
   * Start a new job on the current workflow with a fresh form.
   *
   * Uses client-side router navigation (navigate away to "/" then back to the
   * current route) to force the workflow component to be recreated with clean
   * state. This deliberately avoids `window.location.reload()`, which triggers
   * a full server request for the current deep route (e.g.
   * "/binder-design/de-novo-design"). Hosting has no SPA fallback for those
   * paths, so a hard reload would 404 instead of reopening the form.
   */
  startNewJob(): void {
    this.resetSubmissionState();
    const currentUrl = this.router.url;
    this.router
      .navigateByUrl("/", { skipLocationChange: true })
      .then(() => this.router.navigateByUrl(currentUrl));
  }

  /**
   * Close the success dialog without navigation
   */
  closeSuccessDialog(): void {
    this.showSuccessDialog.set(false);
  }

  /**
   * Reset submission state
   */
  resetSubmissionState(): void {
    this.isSubmitting.set(false);
    this.showSuccessDialog.set(false);
    this.successDialogData.set(null);
  }
}
