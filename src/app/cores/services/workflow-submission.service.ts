import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { WorkflowLaunchForm } from "../interfaces/workflow.interfaces";
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
    // Construct the workflow launch form matching the working Next.js implementation
    const launchForm: WorkflowLaunchForm = {
      pipeline:
        (formData.pipeline as string) || "https://github.com/nextflow-io/hello",
      revision: (formData.revision as string) || "main",
      configProfiles: (formData.configProfiles as string[]) || [],
      runName: (formData.runName as string) || "default-name",
      // Convert all form data to paramsText as JSON string
      paramsText: JSON.stringify({
        ...formData,
      }),
    };

    console.log("Submitting workflow:", launchForm);
    if (datasetId) {
      console.log("With dataset ID:", datasetId);
    }

    // Show loading state
    this.isSubmitting.set(true);

    // Call the API service with dataset ID
    this.workflowApiService.launchWorkflow(launchForm, datasetId).subscribe({
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
