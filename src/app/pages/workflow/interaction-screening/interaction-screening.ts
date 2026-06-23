import { CommonModule } from "@angular/common";
import {
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
  ValidatorFn,
} from "@angular/forms";
import {
  JOB_NAME_VALIDATORS,
  jobNameErrorMessage,
} from "../../../cores/utils/job-name.utils";
import { filter, map, startWith, switchMap, take } from "rxjs/operators";
import { AlertComponent } from "../../../components/alert/alert.component";
import { ButtonComponent } from "../../../components/button/button.component";
import { DialogComponent } from "../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../components/loading/loading.component";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
import { CreditSummaryComponent } from "../../../components/workflow/credit-summary/credit-summary.component";
import { StepContentComponent } from "../../../components/workflow/step-content/step-content.component";
import {
  WorkflowFormComponent,
  WorkflowSection,
} from "../../../components/workflow/workflow-form/workflow-form.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../../../components/workflow/tool-selection/tool-selection.component";
import {
  validateUniqueHeadersAcrossInputs,
  parseMultiFasta,
  validateMultiFastaProtein,
} from "../../../cores/utils/fasta.utils";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../cores/auth.service";
import {
  CreditsService,
  USER_CREDITS_ENABLED,
} from "../../../cores/services/credits.service";
import { FastaUploadService } from "../../../cores/services/fasta-upload.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import { WORKFLOW_INPUT_DIRS } from "../../../cores/config/workflow-paths";
import { getErrorMessage } from "../../../cores/utils/error.utils";
import { InteractionScreeningPayload } from "../../../cores/interfaces/workflow.interfaces";

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

interface TabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

interface ToolChip extends ToolOption {
  id: "boltz" | "colabfold";
}

@Component({
  selector: "app-interaction-screening",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    DialogComponent,
    LoadingComponent,
    ToolSelectionComponent,
    WorkflowFormComponent,
    StepContentComponent,
    ConfigurationSummaryComponent,
    CreditSummaryComponent,
  ],
  host: {
    class: "block w-full interaction-screening-bg",
  },
  templateUrl: "./interaction-screening.html",
  styleUrl: "./interaction-screening.scss",
})
export default class InteractionScreeningComponent {
  // Auth
  public auth = inject(AuthService);
  readonly profileUrl = environment.profileUrl;
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // FASTA upload service
  private fastaUploadService = inject(FastaUploadService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // Credits service (per-tool credit multipliers)
  private creditsService = inject(CreditsService);
  readonly creditsEnabled = USER_CREDITS_ENABLED;
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

  /**
   * Credit cost of the run: tool multiplier × (query entries × target entries).
   */
  creditCost = computed<number | null>(() => {
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
          (w) => w.category === "interaction-screening"
        );
        if (!config) return;
        this.toolMultipliers.set(config.toolMultipliers);
        for (const tool of this.tools) {
          const multiplier = config.toolMultipliers[tool.id];
          if (multiplier != null) {
            tool.credits = multiplier;
          }
        }
      },
      error: (error) => {
        console.warn("Failed to load workflow credits", error);
      },
    });
    this.creditsService.getMyCredit().subscribe({
      next: (response) => this.creditsRemaining.set(response.credit),
      error: (error) => {
        console.warn("Failed to load credit balance", error);
      },
    });
  }
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

  private touchAll(): void {
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

  submitWorkflow() {
    this.touchAll();
    if (!this.isFormValid()) {
      this.workflowForm()?.scrollToFirstInvalidSection();
      return;
    }

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
          const datasetId = datasetResponse.datasetId;
          if (!datasetId) {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no dataset ID was returned."
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
