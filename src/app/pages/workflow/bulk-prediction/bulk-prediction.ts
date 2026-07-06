import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
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
import { map, startWith, switchMap } from "rxjs/operators";
import { CreditSummaryComponent } from "../../../components/workflow/credit-summary/credit-summary.component";
import { WorkflowPreviewModalComponent } from "../../../components/workflow/workflow-preview-modal/workflow-preview-modal.component";
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
import { FastaUploadService } from "../../../cores/services/fasta-upload.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WORKFLOW_INPUT_DIRS } from "../../../cores/config/workflow-paths";
import { BulkPredictionPayload } from "../../../cores/interfaces/workflow.interfaces";
import { getErrorMessage } from "../../../cores/utils/error.utils";
import { WorkflowPageBase } from "../workflow-page-base";

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
    CreditSummaryComponent,
    WorkflowPreviewModalComponent,
  ],
  host: {
    class: "block w-full bulk-prediction-bg",
  },
  templateUrl: "./bulk-prediction.html",
  styleUrl: "./bulk-prediction.scss",
})
export default class BulkPredictionComponent extends WorkflowPageBase {
  // FASTA upload service
  private fastaUploadService = inject(FastaUploadService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // Form
  private fb = inject(NonNullableFormBuilder);

  protected readonly workflowCategory = "bulk-prediction" as const;

  /** Credit cost of the run: tool multiplier × number of FASTA entries. */
  readonly creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    if (multiplier == null) return null;
    const result = validateBulkFastaProtein(this.formValue()?.fasta ?? "");
    if (!result.valid || !result.sequenceCount) return null;
    return multiplier * result.sequenceCount;
  });

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

  readonly isFormValid = computed(() => this.formStatus() === "VALID");

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

  protected validateAll(): void {
    this.form.markAllAsTouched();
  }

  protected performSubmit(): void {
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
}
