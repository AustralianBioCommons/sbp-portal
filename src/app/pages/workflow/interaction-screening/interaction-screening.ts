import { CommonModule } from "@angular/common";
import {
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  signal,
} from "@angular/core";
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
import { parseFasta, ParsedFastaResult } from "../../../cores/utils/fasta.utils";
import { AuthService } from "../../../cores/auth.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";

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
export class InteractionScreeningComponent implements OnInit {
  // Auth
  public auth = inject(AuthService);
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);

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
  isToolAvailable = (_id: ToolChip["id"]) => false;
  selectedTool = signal<ToolChip["id"]>("boltz");
  selectTool(id: ToolChip["id"]) {
    if (!this.isToolAvailable(id)) {
      const label = this.tools.find((t) => t.id === id)?.label ?? id;
      this.showError(`${label} is not available yet.`);
      return;
    }
    this.selectedTool.set(id);
  }
  selectedToolLabel: Signal<string> = computed(
    () => this.tools.find((t) => t.id === this.selectedTool())?.label ?? ""
  );

  // ─── Two fixed FASTA inputs ───────────────────────────────────────────────
  queryFasta = signal('');
  queryFastaTouched = signal(false);
  queryFastaError = signal('');

  targetFasta = signal('');
  targetFastaTouched = signal(false);
  targetFastaError = signal('');

  // ─── Steps ───────────────────────────────────────────────────────────────
  readonly steps: StepItem[] = [
    {
      id: 1,
      title: "Input Configuration",
      description: "Add sequences in FASTA format and assign query / target type",
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
  isFormValid = computed(() =>
    parseFasta(this.queryFasta()).valid &&
    parseFasta(this.targetFasta()).valid
  );

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
  isStepComplete = (id: number) => {
    if (id === 2) return true;
    return this.completedSteps().includes(id);
  };

  // Review step summary
  formSummary = computed(() => {
    const items: { label: string; value: string; fieldName: string }[] = [];
    const qResult = parseFasta(this.queryFasta());
    const tResult = parseFasta(this.targetFasta());
    if (qResult.valid) {
      items.push({
        label: "Query Sequence",
        value: qResult.sequences.map((s) => s.header).join(", "),
        fieldName: "query_sequence",
      });
    }
    if (tResult.valid) {
      items.push({
        label: "Target Sequence",
        value: tResult.sequences.map((s) => s.header).join(", "),
        fieldName: "target_sequence",
      });
    }
    return items;
  });

  // Form validation summary for FormStatusComponent
  getFormValidationSummary(): { valid: boolean; errorCount: number; rowCount: number } {
    const errorCount =
      (parseFasta(this.queryFasta()).valid ? 0 : 1) +
      (parseFasta(this.targetFasta()).valid ? 0 : 1);
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
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.steps.length) this.currentStep.set(step);
  }

  // ─── Query / Target FASTA handlers ───────────────────────────────────────

  onQueryFastaChange(value: string): void {
    this.queryFasta.set(value);
    if (this.queryFastaTouched()) this.validateQuery();
  }

  validateQuery(): void {
    this.queryFastaTouched.set(true);
    this.queryFastaError.set(parseFasta(this.queryFasta()).errorMessage ?? "");
  }

  hasQueryError(): boolean {
    return this.queryFastaTouched() && !!this.queryFastaError();
  }

  getQueryError(): string {
    return this.queryFastaTouched() ? this.queryFastaError() : "";
  }

  getQueryParsedHeaders(): string {
    const result = parseFasta(this.queryFasta());
    return result.valid ? result.sequences.map((s) => s.header).join(", ") : "";
  }

  onTargetFastaChange(value: string): void {
    this.targetFasta.set(value);
    if (this.targetFastaTouched()) this.validateTarget();
  }

  validateTarget(): void {
    this.targetFastaTouched.set(true);
    this.targetFastaError.set(parseFasta(this.targetFasta()).errorMessage ?? "");
  }

  hasTargetError(): boolean {
    return this.targetFastaTouched() && !!this.targetFastaError();
  }

  getTargetError(): string {
    return this.targetFastaTouched() ? this.targetFastaError() : "";
  }

  getTargetParsedHeaders(): string {
    const result = parseFasta(this.targetFasta());
    return result.valid ? result.sequences.map((s) => s.header).join(", ") : "";
  }

  private touchAll(): void {
    this.validateQuery();
    this.validateTarget();
  }

  // ─── Submission ───────────────────────────────────────────────────────────

  /**
   * Build the wisps-compatible payload array.
   * Each element matches the wisps schema_input row: { id, sequence, group }.
   */
  private buildWispsPayload(): Record<string, unknown>[] {
    const qResult = parseFasta(this.queryFasta());
    const tResult = parseFasta(this.targetFasta());
    return [
      {
        id: qResult.sequences[0]?.header ?? "query",
        sequence: this.queryFasta().trim(),
        group: "query",
      },
      {
        id: tResult.sequences[0]?.header ?? "target",
        sequence: this.targetFasta().trim(),
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

    console.log("Starting interaction screening submission…", payload);
    this.workflowSubmission.isSubmitting.set(true);

    this.datasetUploadService.uploadDataset({ formData: payload }).subscribe({
      next: (response) => {
        const datasetId = response.datasetId;
        if (!datasetId) {
          this.workflowSubmission.isSubmitting.set(false);
          this.showError("Dataset upload succeeded but no dataset ID was returned.");
          return;
        }
        const workflowFormData = { ...payload, tool: this.selectedToolLabel() };
        this.workflowSubmission.submitWorkflowWithDataset(
          workflowFormData,
          datasetId,
          (error) => {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(`Workflow launch failed: ${error.message || "Unknown error"}`);
          }
        );
      },
      error: (error) => {
        this.workflowSubmission.isSubmitting.set(false);
        this.showError(`Failed to upload dataset: ${error.message || "Unknown error"}`);
      },
    });
  }

  submitNewJob() { window.location.reload(); }
  goToJobs() { this.workflowSubmission.goToJobs(); }
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

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // No schema loading needed — form uses two fixed FASTA textareas.
  }
}
