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
  validateBulkFastaProtein,
} from "../../../cores/utils/fasta.utils";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../cores/auth.service";
import { FastaUploadService } from "../../../cores/services/fasta-upload.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import { WORKFLOW_INPUT_DIRS } from "../../../cores/config/workflow-paths";
import { getErrorMessage } from "../../../cores/utils/error.utils";

function bulkFastaValidator(control: AbstractControl): ValidationErrors | null {
  const result = validateBulkFastaProtein(control.value ?? "");
  return result.valid ? null : { fasta: result.errorMessage };
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
  selector: "app-bulk-prediction",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    class: "block w-full bulk-prediction-bg",
  },
  templateUrl: "./bulk-prediction.html",
  styleUrls: ["./bulk-prediction.scss"],
})
export default class BulkPredictionComponent {
  // Auth
  public auth = inject(AuthService);
  readonly profileUrl = environment.profileUrl;
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // FASTA upload service
  private fastaUploadService = inject(FastaUploadService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // Form
  private fb = inject(NonNullableFormBuilder);
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

  // Steps
  readonly steps: StepItem[] = [
    {
      id: 1,
      title: "Input Configuration",
      description:
        "Provide a job name, select a prediction tool, and enter sequences in FASTA format",
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

  // Step 2 auto-completes — no tool parameters for bulk prediction
  isStepCompleted = (id: number) => {
    if (id === 2) return true;
    return this.completedSteps().includes(id);
  };

  // Review step summary
  formSummary = computed(() => {
    const val = this.formValue();
    const fastaResult = validateBulkFastaProtein(val?.fasta ?? "");
    const items: { label: string; value: string; fieldName: string }[] = [];

    if (val?.jobName) {
      items.push({
        label: "Job Name",
        value: val.jobName,
        fieldName: "job_id",
      });
    }

    items.push({
      label: "Tool",
      value: this.selectedToolLabel(),
      fieldName: "tool",
    });

    if (fastaResult.valid) {
      items.push({
        label: "FASTA Entries",
        value: `${fastaResult.sequenceCount} sequence${
          fastaResult.sequenceCount !== 1 ? "s" : ""
        }`,
        fieldName: "fasta_entries",
      });
    }

    return items;
  });

  // Step navigation
  nextStep(): void {
    if (this.currentStep() === 1 && !this.isFormValid()) {
      this.form.markAllAsTouched();
      return;
    }
    const next = this.currentStep() + 1;
    if (next <= this.steps.length) {
      this.completedSteps.update((arr) =>
        arr.includes(this.currentStep()) ? arr : [...arr, this.currentStep()]
      );
      this.goToStep(next);
    }
  }

  previousStep(): void {
    const prev = this.currentStep() - 1;
    if (prev >= 1) {
      this.goToStep(prev);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.steps.length) {
      this.currentStep.set(step);
      this.visitedSteps.update((arr) =>
        arr.includes(step) ? arr : [...arr, step]
      );
    }
  }

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

    upload$
      .pipe(
        switchMap(() =>
          this.datasetUploadService.uploadBulkPredictionDataset({
            sequences,
            runId: jobName,
          })
        )
      )
      .subscribe({
        next: (datasetResponse) => {
          const datasetId = datasetResponse.datasetId;
          if (!datasetId) {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no dataset ID was returned."
            );
            return;
          }
          this.workflowSubmission.submitWorkflowWithDataset(
            { tool: this.selectedToolLabel(), runName: jobName },
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
          this.showError(getErrorMessage(error));
        },
      });
  }

  submitNewJob(): void {
    window.location.reload();
  }

  goToJobs(): void {
    this.workflowSubmission.goToJobs();
  }

  loginWithReturnUrl(): void {
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
