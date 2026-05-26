import { CommonModule } from "@angular/common";
import { Component, computed, inject, Signal, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { forkJoin, of } from "rxjs";
import { map, startWith } from "rxjs/operators";
import { AlertComponent } from "../../../components/alert/alert.component";
import { ButtonComponent } from "../../../components/button/button.component";
import { DialogComponent } from "../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../components/loading/loading.component";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
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
  parseMultiFasta,
  validateMultiFastaProtein,
} from "../../../cores/utils/fasta.utils";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../cores/auth.service";
import {
  FastaUploadResponse,
  FastaUploadService,
} from "../../../cores/services/fasta-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import { WORKFLOW_INPUT_DIRS } from "../../../cores/config/workflow-paths";

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
  readonly profileUrl = environment.profileUrl;
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // FASTA upload service
  private fastaUploadService = inject(FastaUploadService);
  // Form
  private fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group(
    {
      jobName: [
        "",
        [
          Validators.required,
          Validators.maxLength(60),
          Validators.pattern(/^(?!\d)[\w-]*$/),
        ],
      ],
      queryFasta: ["", multiFastaValidator],
      targetFasta: ["", multiFastaValidator],
    },
    { validators: maxProductValidator(MAX_SEQUENCE_PRODUCT) }
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
      description: "Add query and target protein sequences in FASTA format",
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
    const val = this.formValue();
    const queryResult = validateMultiFastaProtein(val?.queryFasta ?? "");
    const targetResult = validateMultiFastaProtein(val?.targetFasta ?? "");
    const items: { label: string; value: string; fieldName: string }[] = [];
    if (val?.jobName) {
      items.push({
        label: "Job Name",
        value: val.jobName,
        fieldName: "job_id",
      });
    }
    if (queryResult.valid) {
      items.push({
        label: "Query Sequences",
        value: `${queryResult.sequenceCount} sequence${
          queryResult.sequenceCount !== 1 ? "s" : ""
        }`,
        fieldName: "query_sequences",
      });
    }
    if (targetResult.valid) {
      items.push({
        label: "Target Sequences",
        value: `${targetResult.sequenceCount} sequence${
          targetResult.sequenceCount !== 1 ? "s" : ""
        }`,
        fieldName: "target_sequences",
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
    const productError = !!this.form.errors?.["maxProduct"];
    const errorCount =
      (this.form.controls.jobName.valid ? 0 : 1) +
      (this.form.controls.queryFasta.valid ? 0 : 1) +
      (this.form.controls.targetFasta.valid ? 0 : 1) +
      (productError ? 1 : 0);
    return { valid: this.isFormValid(), errorCount, rowCount: 3 };
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

  // ─── Field error helpers ──────────────────────────────────────────────────

  hasJobNameError(): boolean {
    const ctrl = this.form.controls.jobName;
    return ctrl.touched && ctrl.invalid;
  }

  getJobNameError(): string {
    const errors = this.form.controls.jobName.errors;
    if (errors?.["required"]) return "Job Name is required.";
    if (errors?.["maxlength"])
      return "Job Name must be 60 characters or fewer.";
    if (errors?.["pattern"])
      return "Job Name may only contain letters, numbers, hyphens, and underscores, and must not start with a number.";
    return "";
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
    const queryEntries = parseMultiFasta(this.form.value.queryFasta ?? "");
    const targetEntries = parseMultiFasta(this.form.value.targetFasta ?? "");
    return [
      ...queryEntries.map((e) => ({
        id: e.header,
        sequence: e.sequence,
        group: "query",
      })),
      ...targetEntries.map((e) => ({
        id: e.header,
        sequence: e.sequence,
        group: "target",
      })),
    ];
  }

  submitWorkflow() {
    if (!this.isFormValid()) {
      console.error("Cannot submit: Form validation failed");
      return;
    }

    const sequences = this.buildWispsPayload();

    this.workflowSubmission.isSubmitting.set(true);

    const uploadObservables = sequences.map((seq) => {
      const id = seq["id"] as string;
      const sequence = seq["sequence"] as string;
      const fastaContent = `>${id}\n${sequence}`;
      const blob = new Blob([fastaContent], { type: "text/plain" });
      const file = new File([blob], `${id}.fasta`, { type: "text/plain" });
      return this.fastaUploadService.uploadFastaFile({
        file,
        folder: WORKFLOW_INPUT_DIRS.INTERACTION_SCREENING,
      });
    });

    const uploads$ =
      uploadObservables.length > 0
        ? forkJoin(uploadObservables)
        : of([] as FastaUploadResponse[]);

    uploads$.subscribe({
      next: (uploadResponses) => {
        const fastaS3Uris = uploadResponses.map((r) => r.s3Uri);
        console.log("FASTA uploads complete:", fastaS3Uris);
        this.workflowSubmission.isSubmitting.set(false);
      },
      error: (error) => {
        this.workflowSubmission.isSubmitting.set(false);
        this.showError(
          `Failed to upload FASTA files: ${error.message || "Unknown error"}`
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
