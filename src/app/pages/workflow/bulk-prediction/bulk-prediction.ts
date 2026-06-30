import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  Signal,
  signal,
  viewChild,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from "@angular/forms";
import {
  JOB_NAME_VALIDATORS,
  jobNameErrorMessage,
} from "../../../cores/utils/job-name.utils";
import { filter, map, startWith, switchMap, take } from "rxjs/operators";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
import { CreditSummaryComponent } from "../../../components/workflow/credit-summary/credit-summary.component";
import { StepContentComponent } from "../../../components/workflow/step-content/step-content.component";
import { WorkflowLayoutComponent } from "../../../layouts/workflow-layout/workflow-layout.component";
import {
  WorkflowFormComponent,
  WorkflowSection,
} from "../../../components/workflow/workflow-form/workflow-form.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../../../components/workflow/tool-selection/tool-selection.component";
import {
  parseMultiFasta,
  validateBulkFastaProtein,
} from "../../../cores/utils/fasta.utils";
import { AuthService } from "../../../cores/auth.service";
import {
  CreditsService,
  USER_CREDITS_ENABLED,
} from "../../../cores/services/credits.service";
import { FastaUploadService } from "../../../cores/services/fasta-upload.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import { WORKFLOW_INPUT_DIRS } from "../../../cores/config/workflow-paths";
import { BulkPredictionPayload } from "../../../cores/interfaces/workflow.interfaces";
import { getErrorMessage } from "../../../cores/utils/error.utils";

function bulkFastaValidator(control: AbstractControl): ValidationErrors | null {
  const result = validateBulkFastaProtein(control.value ?? "");
  return result.valid ? null : { fasta: result.errorMessage };
}

interface ToolChip extends ToolOption {
  id: "boltz" | "colabfold";
}

@Component({
  selector: "app-bulk-prediction",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToolSelectionComponent,
    WorkflowFormComponent,
    WorkflowLayoutComponent,
    StepContentComponent,
    ConfigurationSummaryComponent,
    CreditSummaryComponent,
  ],
  host: {
    class: "block w-full bulk-prediction-bg",
  },
  templateUrl: "./bulk-prediction.html",
  styleUrl: "./bulk-prediction.scss",
})
export default class BulkPredictionComponent {
  // Auth
  public auth = inject(AuthService);
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // FASTA upload service
  private fastaUploadService = inject(FastaUploadService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // Credits service (per-tool credit multipliers)
  private creditsService = inject(CreditsService);
  readonly creditsEnabled = USER_CREDITS_ENABLED;
  // OnPush component — credits arrive async, so mark for check when they do.
  private cdr = inject(ChangeDetectorRef);
  // Form
  private fb = inject(NonNullableFormBuilder);

  constructor() {
    if (this.creditsEnabled) {
      // Only call the credit service once the user is authenticated; the
      // /api/* requests require a bearer token and otherwise fail, blocking
      // the page from rendering.
      this.auth.isAuthenticated$
        .pipe(filter(Boolean), take(1))
        .subscribe(() => this.loadToolCredits());
    }
  }

  /** Per-tool credit multipliers for this workflow (from the backend). */
  private toolMultipliers = signal<Partial<Record<ToolChip["id"], number>>>({});
  /**
   * Remaining credit balance for the current user. Starts at 0 until the real
   * balance from getMyCredit() loads.
   */
  creditsRemaining = signal<number | null>(0);

  /** Credit cost of the run: tool multiplier × number of FASTA entries. */
  creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    if (multiplier == null) return null;
    const result = validateBulkFastaProtein(this.formValue()?.fasta ?? "");
    if (!result.valid || !result.sequenceCount) return null;
    return multiplier * result.sequenceCount;
  });

  /** True when the run's cost is known to exceed the user's remaining balance. */
  creditsInsufficient = computed<boolean>(() => {
    const cost = this.creditCost();
    const remaining = this.creditsRemaining();
    return cost !== null && remaining !== null && cost > remaining;
  });

  /** Fetch per-tool credit multipliers and the user's remaining balance. */
  private loadToolCredits(): void {
    this.creditsService.getWorkflowCredits().subscribe({
      next: (response) => {
        const config = response.workflows.find(
          (w) => w.category === "bulk-prediction"
        );
        if (!config) return;
        this.toolMultipliers.set(config.toolMultipliers);
        for (const tool of this.tools) {
          const multiplier = config.toolMultipliers[tool.id];
          if (multiplier != null) {
            tool.credits = multiplier;
          }
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.warn("Failed to load workflow credits", error);
      },
    });
    this.creditsService.getMyCredit().subscribe({
      next: (response) => {
        this.creditsRemaining.set(response.credit);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.warn("Failed to load credit balance", error);
      },
    });
  }
  readonly form = this.fb.group({
    jobName: ["", JOB_NAME_VALIDATORS],
    fasta: ["", bulkFastaValidator],
  });
  private formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status))
  );
  private formValue: Signal<{ jobName: string; fasta: string }> = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue())
    ),
    { initialValue: this.form.getRawValue() }
  );

  // Alert state
  showAlert = signal(false);
  alertMessage = signal("");

  // Tools
  readonly tools: ToolChip[] = [
    { id: "boltz", label: "Boltz" },
    { id: "colabfold", label: "ColabFold" },
  ];
  selectedTool = signal<ToolChip["id"]>("boltz");
  selectTool(id: ToolChip["id"]) {
    this.selectedTool.set(id);
  }
  selectedToolLabel: Signal<string> = computed(
    () => this.tools.find((t) => t.id === this.selectedTool())?.label ?? ""
  );

  // Single-page form sections (rendered + tracked by app-workflow-form)
  readonly sections: WorkflowSection[] = [
    { id: "select-tool", label: "Select a Tool", mobileLabel: "Tool" },
    { id: "input-config", label: "Input Configuration", mobileLabel: "Input" },
    { id: "tool-settings", label: "Tool Settings", mobileLabel: "Settings" },
    { id: "review", label: "Review & Submit", mobileLabel: "Review" },
  ];

  /** Reference to the workflow-form shell, used to scroll to invalid sections. */
  private readonly workflowForm = viewChild(WorkflowFormComponent);

  isFormValid = computed(() => this.formStatus() === "VALID");

  /** Per-section validity — drives the progress-bar colours. */
  isSectionValid = (id: string): boolean => {
    switch (id) {
      case "input-config":
      case "review":
        return this.isFormValid();
      default:
        // select-tool (a tool is always selected) and tool-settings (no params).
        return true;
    }
  };

  // Review step summary
  formSummary = computed(() => {
    const val = this.formValue();
    const fastaResult = validateBulkFastaProtein(val?.fasta ?? "");
    return [
      {
        label: "Job Name",
        value: val?.jobName ?? "",
        fieldName: "job_id",
      },
      {
        label: "FASTA Entries",
        value: fastaResult.valid
          ? `${fastaResult.sequenceCount} sequence${
              fastaResult.sequenceCount !== 1 ? "s" : ""
            }`
          : "",
        fieldName: "fasta_entries",
      },
    ];
  });

  // Field error helpers
  hasJobNameError(): boolean {
    const ctrl = this.form.controls.jobName;
    return ctrl.touched && ctrl.invalid;
  }

  getJobNameError(): string {
    return jobNameErrorMessage(this.form.controls.jobName.errors);
  }

  hasFastaError(): boolean {
    const ctrl = this.form.controls.fasta;
    return ctrl.touched && ctrl.invalid;
  }

  getFastaError(): string {
    return this.form.controls.fasta.errors?.["fasta"] ?? "";
  }

  // Submission
  private buildBulkPayload(): { id: string; sequence: string }[] {
    const entries = parseMultiFasta(this.form.value.fasta ?? "");
    return entries.map((e) => ({ id: e.header, sequence: e.sequence }));
  }

  submitWorkflow(): void {
    if (!this.isFormValid()) {
      this.form.markAllAsTouched();
      this.workflowForm()?.scrollToFirstInvalidSection();
      return;
    }

    const jobName = this.form.value.jobName ?? "";
    const sequences = this.buildBulkPayload();

    this.workflowSubmission.isSubmitting.set(true);

    const combinedFasta = sequences
      .map((seq) => `>${seq.id}\n${seq.sequence}`)
      .join("\n");
    const blob = new Blob([combinedFasta], { type: "text/plain" });
    const file = new File([blob], "sequences.fasta", { type: "text/plain" });

    const upload$ = this.fastaUploadService.uploadFastaFile({
      file,
      folder: WORKFLOW_INPUT_DIRS.BULK_PREDICTION,
    });

    let fastaS3Uri = "";

    upload$
      .pipe(
        switchMap((uploadResp) => {
          fastaS3Uri = uploadResp.s3Uri;
          return this.datasetUploadService.uploadBulkPredictionDataset({
            sequences,
            runId: jobName,
          });
        })
      )
      .subscribe({
        next: (datasetResponse) => {
          const s3InputKey = datasetResponse.s3Key;
          if (!s3InputKey) {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no S3 key was returned."
            );
            return;
          }
          const splitOutputDir = datasetResponse.splitOutputDir;
          if (!splitOutputDir) {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload did not return a split output directory."
            );
            return;
          }
          const formData: BulkPredictionPayload = {
            workflow: "bulk-prediction",
            tool: this.selectedTool(),
            runName: jobName,
            sample_id: jobName,
            fastaS3Uri,
            splitOutputDir,
          };
          this.workflowSubmission.submitWorkflowWithDataset(
            formData,
            s3InputKey,
            (error) => {
              this.workflowSubmission.isSubmitting.set(false);
              this.showError(
                `Workflow launch failed: ${error.message || "Unknown error"}`
              );
            }
          );
        },
        error: (error) => {
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(getErrorMessage(error));
        },
      });
  }

  closeAlert(): void {
    this.showAlert.set(false);
    this.alertMessage.set("");
  }

  private showError(message: string): void {
    this.alertMessage.set(message);
    this.showAlert.set(true);
  }
}
