import {
  ChangeDetectorRef,
  computed,
  DestroyRef,
  Directive,
  inject,
  OnInit,
  Signal,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, take } from "rxjs";
import { ToolOption } from "./components/tool-selection/tool-selection.component";
import { WorkflowFormComponent } from "./components/workflow-form/workflow-form.component";
import { AuthService } from "../../core/services/auth.service";
import {
  CreditsService,
  USER_CREDITS_ENABLED,
} from "../../core/services/credits.service";
import { WorkflowSubmissionService } from "./services/workflow-submission.service";
import { WorkflowName, WorkflowTool } from "./workflow.interfaces";
import { WORKFLOW_INPUT_DIRS } from "./workflow-paths";

/**
 * Shared base for the workflow pages: owns the validate → preview → submit
 * flow, alert state, and credit wiring. Each page implements a small contract
 * ({@link validateAll}, {@link isFormValid}, {@link performSubmit},
 * {@link creditCost}, {@link workflowCategory}, {@link tools},
 * {@link selectedTool}) and keeps its own form internals.
 */
@Directive()
export abstract class WorkflowPageBase implements OnInit {
  readonly auth = inject(AuthService);
  readonly workflowSubmission = inject(WorkflowSubmissionService);
  protected readonly creditsService = inject(CreditsService);

  protected readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly creditsEnabled = USER_CREDITS_ENABLED;

  readonly showPreview = signal(false);
  readonly showAlert = signal(false);
  readonly alertMessage = signal("");

  protected readonly workflowFormShell = viewChild(WorkflowFormComponent);

  protected abstract readonly workflowCategory: WorkflowName;

  protected get workflowInputDir(): string {
    return WORKFLOW_INPUT_DIRS[this.workflowCategory];
  }

  protected abstract readonly tools: ToolOption<WorkflowTool>[];
  protected abstract readonly selectedTool: Signal<WorkflowTool>;
  abstract readonly creditCost: Signal<number | null>;

  protected readonly toolMultipliers = signal<
    Partial<Record<WorkflowTool, number>>
  >({});
  readonly creditsRemaining = signal<number | null>(null);
  readonly creditsInsufficient = computed<boolean>(() => {
    const cost = this.creditCost();
    const remaining = this.creditsRemaining();
    return cost !== null && remaining !== null && cost > remaining;
  });

  protected abstract validateAll(): void;
  abstract readonly isFormValid: Signal<boolean>;
  protected abstract performSubmit(): void;

  protected guardSubmission(): boolean {
    return true;
  }

  ngOnInit(): void {
    if (this.creditsEnabled) {
      this.auth.isAuthenticated$
        .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadToolCredits());
    }
  }

  onContinueToPreview(): void {
    if (!this.guardSubmission()) return;
    this.validateAll();
    if (!this.isFormValid()) {
      this.workflowFormShell()?.focusFirstInvalidField();
      return;
    }
    this.showPreview.set(true);
  }

  onPreviewConfirmed(): void {
    this.showPreview.set(false);
    this.submitWorkflow();
  }

  submitWorkflow(): void {
    if (!this.guardSubmission()) return;
    this.validateAll();
    if (!this.isFormValid()) {
      this.workflowFormShell()?.scrollToFirstInvalidSection();
      return;
    }
    this.performSubmit();
  }

  closeAlert(): void {
    this.showAlert.set(false);
    this.alertMessage.set("");
  }

  protected showError(message: string): void {
    this.alertMessage.set(message);
    this.showAlert.set(true);
  }

  private loadToolCredits(): void {
    this.creditsService
      .getWorkflowCredits()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const config = response.workflows.find(
            (w) => w.category === this.workflowCategory
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
    this.creditsService
      .getMyCredit()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.creditsRemaining.set(response.credit);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.warn("Failed to load credit balance", error);
        },
      });
  }
}
