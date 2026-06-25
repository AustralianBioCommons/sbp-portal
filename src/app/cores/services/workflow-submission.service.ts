import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { getErrorMessage } from "../utils/error.utils";
import { WorkflowApiService } from "./workflow-api.service";
import {
  CreditsService,
  INSUFFICIENT_CREDITS_MESSAGE,
  USER_CREDITS_ENABLED,
} from "./credits.service";
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
  private creditsService = inject(CreditsService);

  // Success dialog state
  showSuccessDialog = signal<boolean>(false);
  successDialogData = signal<{ runId: string; status: string } | null>(null);
  // Loading state during submission
  isSubmitting = signal<boolean>(false);

  /**
   * Submit workflow with form data and S3 input key
   * @param formData - The form data to submit
   * @param s3InputKey - S3 object key for the input samplesheet CSV
   * @param onError - Optional error handler
   */
  submitWorkflowWithDataset(
    formData: WorkflowFormData,
    s3InputKey?: string,
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
    if (s3InputKey) {
      console.log("With S3 input key:", s3InputKey);
    }

    const normalizedS3InputKey = s3InputKey?.trim();
    if (!normalizedS3InputKey) {
      const error = new Error("s3InputKey is required to launch workflow.");
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
      .launchWorkflow(launch, formData, normalizedS3InputKey)
      .subscribe({
        next: (response) => {
          console.log("Workflow launched successfully:", response);
          // Hide loading state
          this.isSubmitting.set(false);
          // The backend deducts credits server-side on launch; refresh the
          // shared balance so the navbar/forms reflect the new amount.
          if (USER_CREDITS_ENABLED) {
            this.creditsService.refreshBalance();
          }
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

          // A 402 means the backend's authoritative balance check rejected the
          // launch (e.g. the balance changed since the form was filled). Show
          // the friendly insufficient-credit message and re-sync the balance.
          const status = (error as { status?: number })?.status;
          const isInsufficientCredit = status === 402;
          const message = isInsufficientCredit
            ? INSUFFICIENT_CREDITS_MESSAGE
            : getErrorMessage(error);
          if (USER_CREDITS_ENABLED) {
            this.creditsService.refreshBalance();
          }

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
