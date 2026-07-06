import { CommonModule } from "@angular/common";
import { Component, computed, inject, Signal, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";
import {
  JOB_NAME_VALIDATORS,
  jobNameErrorMessage,
} from "../job-name.validators";
import { map, startWith, switchMap } from "rxjs/operators";
import { CreditSummaryComponent } from "../components/credit-summary/credit-summary.component";
import { WorkflowPreviewModalComponent } from "../components/workflow-preview-modal/workflow-preview-modal.component";
import { StepContentComponent } from "../components/step-content/step-content.component";
import { WorkflowLayoutComponent } from "../layout/workflow-layout/workflow-layout.component";
import {
  WorkflowFormComponent,
  WorkflowSection,
} from "../components/workflow-form/workflow-form.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../components/tool-selection/tool-selection.component";
import {
  validateUniqueHeadersAcrossInputs,
  parseMultiFasta,
  validateMultiFastaProtein,
} from "../fasta.utils";
import { FastaUploadService } from "../services/fasta-upload.service";
import { DatasetUploadService } from "../services/dataset-upload.service";
import { WORKFLOW_INPUT_DIRS } from "../workflow-paths";
import { getErrorMessage } from "../../../core/utils/error.utils";
import { InteractionScreeningPayload } from "../workflow.interfaces";
import { WorkflowPageBase } from "../workflow-page-base";

function multiFastaValidator(
  control: AbstractControl
): ValidationErrors | null {
  const result = validateMultiFastaProtein(control.value ?? "");
  return result.valid ? null : { fasta: result.errorMessage };
}

const MAX_SEQUENCE_PRODUCT = 1000;

function maxProductValidator(max: number): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const queryVal = group.get("queryFasta")?.value ?? "";
    const targetVal = group.get("targetFasta")?.value ?? "";
    const queryResult = validateMultiFastaProtein(queryVal);
    const targetResult = validateMultiFastaProtein(targetVal);
    if (!queryResult.valid || !targetResult.valid) return null;
    const product = queryResult.sequenceCount * targetResult.sequenceCount;
    return product >= max ? { maxProduct: { actual: product, max } } : null;
  };
}

function uniqueSequencesValidator(
  group: AbstractControl
): ValidationErrors | null {
  const queryVal = group.get("queryFasta")?.value ?? "";
  const targetVal = group.get("targetFasta")?.value ?? "";
  if (
    !validateMultiFastaProtein(queryVal).valid ||
    !validateMultiFastaProtein(targetVal).valid
  ) {
    return null;
  }
  const result = validateUniqueHeadersAcrossInputs(queryVal, targetVal);
  return result.valid ? null : { duplicateSequences: result.errorMessage };
}

interface ToolChip extends ToolOption {
  id: "boltz" | "colabfold";
}

@Component({
  selector: "app-interaction-screening",
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
    class: "block w-full interaction-screening-bg",
  },
  templateUrl: "./interaction-screening.html",
  styleUrl: "./interaction-screening.scss",
})
export default class InteractionScreeningComponent extends WorkflowPageBase {
  // FASTA upload service
  private fastaUploadService = inject(FastaUploadService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // Form
  private fb = inject(NonNullableFormBuilder);

  protected readonly workflowCategory = "interaction-screening" as const;

  /**
   * Credit cost of the run: tool multiplier × (query entries × target entries).
   */
  readonly creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    if (multiplier == null) return null;
    const val = this.formValue();
    const query = validateMultiFastaProtein(val?.queryFasta ?? "");
    const target = validateMultiFastaProtein(val?.targetFasta ?? "");
    if (!query.valid || !target.valid) return null;
    const product = query.sequenceCount * target.sequenceCount;
    if (!product) return null;
    return multiplier * product;
  });

  readonly form = this.fb.group(
    {
      jobName: ["", JOB_NAME_VALIDATORS],
      queryFasta: ["", multiFastaValidator],
      targetFasta: ["", multiFastaValidator],
    },
    {
      validators: [
        maxProductValidator(MAX_SEQUENCE_PRODUCT),
        uniqueSequencesValidator,
      ],
    }
  );
  private formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status))
  );
  private formValue: Signal<{
    jobName: string;
    queryFasta: string;
    targetFasta: string;
  }> = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue())
    ),
    { initialValue: this.form.getRawValue() }
  );

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

  // ─── Sections ────────────────────────────────────────────────────────────
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
    const queryResult = validateMultiFastaProtein(val?.queryFasta ?? "");
    const targetResult = validateMultiFastaProtein(val?.targetFasta ?? "");
    return [
      {
        label: "Job Name",
        value: val?.jobName ?? "",
        fieldName: "job_id",
      },
      {
        label: "Query Sequences",
        value: queryResult.valid
          ? `${queryResult.sequenceCount} sequence${
              queryResult.sequenceCount !== 1 ? "s" : ""
            }`
          : "",
        fieldName: "query_sequences",
      },
      {
        label: "Target Sequences",
        value: targetResult.valid
          ? `${targetResult.sequenceCount} sequence${
              targetResult.sequenceCount !== 1 ? "s" : ""
            }`
          : "",
        fieldName: "target_sequences",
      },
    ];
  });

  // Form validation summary for FormStatusComponent
  getFormValidationSummary(): {
    valid: boolean;
    errorCount: number;
    rowCount: number;
  } {
    const productError = !!this.form.errors?.["maxProduct"];
    const errorCount =
      (this.form.controls.jobName.valid ? 0 : 1) +
      (this.form.controls.queryFasta.valid ? 0 : 1) +
      (this.form.controls.targetFasta.valid ? 0 : 1) +
      (productError ? 1 : 0);
    return { valid: this.isFormValid(), errorCount, rowCount: 3 };
  }

  // ─── Field error helpers ──────────────────────────────────────────────────

  hasJobNameError(): boolean {
    const ctrl = this.form.controls.jobName;
    return ctrl.touched && ctrl.invalid;
  }

  getJobNameError(): string {
    return jobNameErrorMessage(this.form.controls.jobName.errors);
  }

  hasQueryError(): boolean {
    const ctrl = this.form.controls.queryFasta;
    return ctrl.touched && ctrl.invalid;
  }

  getQueryError(): string {
    return this.form.controls.queryFasta.errors?.["fasta"] ?? "";
  }

  hasTargetError(): boolean {
    const ctrl = this.form.controls.targetFasta;
    return ctrl.touched && ctrl.invalid;
  }

  getTargetError(): string {
    return this.form.controls.targetFasta.errors?.["fasta"] ?? "";
  }

  hasProductError(): boolean {
    return !!this.form.errors?.["maxProduct"];
  }

  getProductError(): string {
    const err = this.form.errors?.["maxProduct"];
    if (!err) return "";
    return `Too many sequence combinations: ${
      err.actual
    } pairs (query × target). The maximum is ${err.max - 1}.`;
  }

  hasDuplicateSequencesError(): boolean {
    return !!this.form.errors?.["duplicateSequences"];
  }

  getDuplicateSequencesError(): string {
    return this.form.errors?.["duplicateSequences"] ?? "";
  }

  protected validateAll(): void {
    this.form.markAllAsTouched();
  }

  // ─── Submission ───────────────────────────────────────────────────────────

  private buildWispsPayload(): {
    id: string;
    sequence: string;
    group: "query" | "target";
  }[] {
    const queryEntries = parseMultiFasta(this.form.value.queryFasta ?? "");
    const targetEntries = parseMultiFasta(this.form.value.targetFasta ?? "");
    return [
      ...queryEntries.map((e) => ({
        id: e.header,
        sequence: e.sequence,
        group: "query" as const,
      })),
      ...targetEntries.map((e) => ({
        id: e.header,
        sequence: e.sequence,
        group: "target" as const,
      })),
    ];
  }

  protected performSubmit(): void {
    const jobName = this.form.value.jobName ?? "";
    const sequences = this.buildWispsPayload();

    this.workflowSubmission.isSubmitting.set(true);

    const combinedFasta = sequences
      .map((seq) => `>${seq.id}\n${seq.sequence}`)
      .join("\n");
    const blob = new Blob([combinedFasta], { type: "text/plain" });
    const file = new File([blob], `sequences.fasta`, { type: "text/plain" });
    const upload$ = this.fastaUploadService.uploadFastaFile({
      file,
      folder: WORKFLOW_INPUT_DIRS.INTERACTION_SCREENING,
    });

    let fastaS3Uri = "";

    upload$
      .pipe(
        switchMap((uploadResp) => {
          fastaS3Uri = uploadResp.s3Uri;
          return this.datasetUploadService.uploadInteractionScreeningDataset({
            sequences: sequences.map((s) => ({ id: s.id, group: s.group })),
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
          const payload: InteractionScreeningPayload = {
            tool: this.selectedTool(),
            runName: jobName,
            workflow: "interaction-screening",
            sample_id: jobName,
            fastaS3Uri,
            splitOutputDir,
          };
          this.workflowSubmission.submitWorkflowWithDataset(
            payload,
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
