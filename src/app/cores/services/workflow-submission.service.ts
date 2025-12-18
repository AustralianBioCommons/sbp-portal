import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { WorkflowApiService } from "./workflow-api.service";

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
   * Submit workflow with form data
   * @param formData - The form data to submit
   * @param onError - Optional error handler
   */
  submitWorkflow(
    formData: Record<string, unknown>,
    onError?: (error: Error) => void
  ): void {
    this.submitWorkflowWithDataset(formData, undefined, onError);
  }

  /**
   * Submit workflow with form data and optional dataset ID
   * @param formData - The form data to submit
   * @param datasetId - Optional dataset ID to attach to the workflow
   * @param onError - Optional error handler
   */
  submitWorkflowWithDataset(
    formData: Record<string, unknown>,
    datasetId?: string,
    onError?: (error: Error) => void
  ): void {
    // Generate a random run name with timestamp and random string
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const randomRunName = `run-${timestamp}-${randomStr}`;

    // Construct the launch configuration
    const launch = {
      pipeline:
        (formData.pipeline as string),
      revision: (formData.revision as string) || "dev",
      configProfiles: (formData.configProfiles as string[]) || ["singularity"],
      runName: (formData.runName as string) || randomRunName,
      paramsText: null as string | null,
    };

    console.log("Submitting workflow with launch config:", launch);
    console.log("Form data:", formData);
    if (datasetId) {
      console.log("With dataset ID:", datasetId);
    }

    // Show loading state
    this.isSubmitting.set(true);

    // Call the API service with separate launch and formData
    this.workflowApiService.launchWorkflow(launch, formData, datasetId).subscribe({
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
        // Hide loading state
        this.isSubmitting.set(false);

        // Call custom error handler if provided
        if (onError) {
          onError(error);
        } else {
          // Default error handling
          alert(
            `Failed to launch workflow: ${error.message || "Unknown error"}`
          );
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
