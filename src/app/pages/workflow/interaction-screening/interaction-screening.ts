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
import { startWith } from "rxjs/operators";
import { AlertComponent } from "../../../components/alert/alert.component";
import { ButtonComponent } from "../../../components/button/button.component";
import { DialogComponent } from "../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../components/loading/loading.component";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
import { FormStatusComponent } from "../../../components/workflow/form-status/form-status.component";
import { StepContentComponent } from "../../../components/workflow/step-content/step-content.component";
import {
  Step,
  StepNavigationComponent,
} from "../../../components/workflow/step-navigation/step-navigation.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../../../components/workflow/tool-selection/tool-selection.component";
import {
  SequenceValidationResult,
  validateProteinSequence,
} from "../../../cores/utils/fasta.utils";
import { AuthService } from "../../../cores/auth.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";

function fastaValidator(
  validate: (seq: string) => SequenceValidationResult
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = validate(control.value ?? "");
    return result.valid ? null : { fasta: result.errorMessage };
  };
}

interface TabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

interface ToolChip extends ToolOption {
  id: "boltz" | "colabfold";
}

type StepItem = Step;

@Component({
  selector: "app-interaction-screening",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    DialogComponent,
    LoadingComponent,
    ToolSelectionComponent,
    StepNavigationComponent,
    StepContentComponent,
    ConfigurationSummaryComponent,
    FormStatusComponent,
  ],
  host: {
    class: "block w-full interaction-screening-bg",
  },
  templateUrl: "./interaction-screening.html",
  styleUrls: ["./interaction-screening.scss"],
})
export class InteractionScreeningComponent {
  // Auth
  public auth = inject(AuthService);
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // Form
  private fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group({
    queryFasta: ["", fastaValidator(validateProteinSequence)],
    targetFasta: ["", fastaValidator(validateProteinSequence)],
  });
  private formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status))
  );
  private formValue: Signal<
    { queryFasta?: string; targetFasta?: string } | undefined
  > = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())));
  // Alert state
  showAlert = signal(false);
  alertMessage = signal("");

  // Tabs
  readonly tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "output", label: "Output" },
    { id: "papers", label: "Papers" },
  ];
  activeTab = signal<TabItem["id"]>("overview");
  isActiveTab = (id: TabItem["id"]) => this.activeTab() === id;
  switchTab(id: TabItem["id"]) {
    this.activeTab.set(id);
  }

  // No tools are currently available
  readonly tools: ToolChip[] = [
    { id: "boltz", label: "Boltz" },
    { id: "colabfold", label: "ColabFold" },
  ];
  readonly unavailableToolLabels: string[] = this.tools.map((t) => t.label);
  isToolAvailable = () => false;
  selectedTool = signal<ToolChip["id"]>("boltz");
  selectTool(id: ToolChip["id"]) {
    if (!this.isToolAvailable()) {
      const label = this.tools.find((t) => t.id === id)?.label ?? id;
      this.showError(`${label} is not available yet.`);
      return;
    }
    this.selectedTool.set(id);
  }
  selectedToolLabel: Signal<string> = computed(
    () => this.tools.find((t) => t.id === this.selectedTool())?.label ?? ""
  );

  // ─── Steps ───────────────────────────────────────────────────────────────
  readonly steps: StepItem[] = [
    {
      id: 1,
      title: "Input Configuration",
      description: "Add query and target protein sequences",
    },
    {
      id: 2,
      title: "Tool Settings",
      description: "Configure parameters specific to the selected tool",
    },
    {
      id: 3,
      title: "Review & Submit",
      description: "Review all settings and run the job",
    },
  ];
  currentStep = signal<number>(1);
  completedSteps = signal<number[]>([]);
  visitedSteps = signal<number[]>([1]);
  isStepVisited = (id: number) => this.visitedSteps().includes(id);
  isFormValid = computed(() => this.formStatus() === "VALID");

  canGoPrev: Signal<boolean> = computed(() => this.currentStep() > 1);
  canGoNext: Signal<boolean> = computed(() => {
    if (this.currentStep() < this.steps.length) {
      if (this.currentStep() === 1) return this.isFormValid();
      return true;
    }
    return false;
  });

  isStepInvalid = (id: number) => {
    if (id === 1) return !this.isFormValid();
    return false;
  };

  // Step 2 auto-completes — no tool parameters for now
  isStepCompleted = (id: number) => {
    if (id === 2) return true;
    return this.completedSteps().includes(id);
  };

  // Review step summary
  formSummary = computed(() => {
    const queryFasta = this.formValue()?.queryFasta ?? "";
    const targetFasta = this.formValue()?.targetFasta ?? "";
    const items: { label: string; value: string; fieldName: string }[] = [];
    if (validateProteinSequence(queryFasta).valid) {
      items.push({
        label: "Query Sequence",
        value:
          queryFasta.trim().slice(0, 40) +
          (queryFasta.trim().length > 40 ? "…" : ""),
        fieldName: "query_sequence",
      });
    }
    if (validateProteinSequence(targetFasta).valid) {
      items.push({
        label: "Target Sequence",
        value:
          targetFasta.trim().slice(0, 40) +
          (targetFasta.trim().length > 40 ? "…" : ""),
        fieldName: "target_sequence",
      });
    }
    return items;
  });

  // Form validation summary for FormStatusComponent
  getFormValidationSummary(): {
    valid: boolean;
    errorCount: number;
    rowCount: number;
  } {
    const errorCount =
      (this.form.controls.queryFasta.valid ? 0 : 1) +
      (this.form.controls.targetFasta.valid ? 0 : 1);
    return { valid: this.isFormValid(), errorCount, rowCount: 2 };
  }

  previousStep() {
    if (this.currentStep() > 1) this.currentStep.update((v) => v - 1);
  }

  nextStep() {
    if (this.currentStep() < this.steps.length) {
      const current = this.currentStep();
      if (current === 1) {
        this.touchAll();
        if (!this.isFormValid()) return;
      }
      this.completedSteps.update((arr) =>
        arr.includes(current) ? arr : [...arr, current]
      );
      this.currentStep.update((v) => v + 1);
      this.visitedSteps.update((arr) => {
        const next = current + 1;
        return arr.includes(next) ? arr : [...arr, next];
      });
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.steps.length) {
      this.currentStep.set(step);
      this.visitedSteps.update((arr) =>
        arr.includes(step) ? arr : [...arr, step]
      );
    }
  }

  // ─── Query / Target FASTA error helpers ──────────────────────────────────

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

  private touchAll(): void {
    this.form.markAllAsTouched();
  }

  // ─── Submission ───────────────────────────────────────────────────────────

  /**
   * Build the wisps-compatible payload array.
   * Each element matches the wisps schema_input row: { id, sequence, group }.
   * Whitespace normalisation matches the validator (replace(/\s+/g, "")).
   */
  private buildWispsPayload(): Record<string, unknown>[] {
    return [
      {
        id: "query",
        sequence: (this.form.value.queryFasta ?? "").replace(/\s+/g, ""),
        group: "query",
      },
      {
        id: "target",
        sequence: (this.form.value.targetFasta ?? "").replace(/\s+/g, ""),
        group: "target",
      },
    ];
  }

  submitWorkflow() {
    if (!this.isFormValid()) {
      console.error("Cannot submit: Form validation failed");
      return;
    }

    const sequences = this.buildWispsPayload();
    const payload: Record<string, unknown> = {
      sequences,
      tool: this.selectedToolLabel(),
    };

    console.log("Starting interaction screening submission…", {
      tool: payload["tool"],
      hasSequences: Array.isArray(sequences)
        ? sequences.length > 0
        : !!sequences,
    });
    this.workflowSubmission.isSubmitting.set(true);

    this.datasetUploadService.uploadDataset({ formData: payload }).subscribe({
      next: (response) => {
        const datasetId = response.datasetId;
        if (!datasetId) {
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(
            "Dataset upload succeeded but no dataset ID was returned."
          );
          return;
        }
        const workflowFormData = { ...payload, tool: this.selectedToolLabel() };
        this.workflowSubmission.submitWorkflowWithDataset(
          workflowFormData,
          datasetId,
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
        this.showError(
          `Failed to upload dataset: ${error.message || "Unknown error"}`
        );
      },
    });
  }

  submitNewJob() {
    window.location.reload();
  }
  goToJobs() {
    this.workflowSubmission.goToJobs();
  }
  loginWithReturnUrl() {
    const currentUrl = window.location.pathname + window.location.search;
    this.auth.login(currentUrl);
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
