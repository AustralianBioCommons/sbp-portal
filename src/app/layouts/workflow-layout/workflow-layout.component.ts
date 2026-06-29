import { CommonModule } from "@angular/common";
import { Component, inject, input, output, signal } from "@angular/core";
import { AlertComponent } from "../../components/alert/alert.component";
import { ButtonComponent } from "../../components/button/button.component";
import { DialogComponent } from "../../components/dialog/dialog.component";
import { LoadingComponent } from "../../components/loading/loading.component";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../cores/auth.service";
import { WorkflowSubmissionService } from "../../cores/services/workflow-submission.service";

export interface WorkflowTabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

/**
 * Shared chrome for every workflow page: background, tab nav, title block,
 * access-restricted overlay, output/papers panels, loading overlay and the
 * submission success dialog. Each page projects its `app-workflow-form` into
 * the default slot, the subtitle and Overview description into `[description]`
 * and `[overview]` (so they may contain rich markup), and may project extra
 * Papers content via `[papers]`.
 */
@Component({
  selector: "app-workflow-layout",
  imports: [
    CommonModule,
    AlertComponent,
    ButtonComponent,
    DialogComponent,
    LoadingComponent,
  ],
  templateUrl: "./workflow-layout.component.html",
  styleUrl: "./workflow-layout.component.scss",
  host: { class: "block w-full" },
})
export class WorkflowLayoutComponent {
  /** Page heading shown above the tab content. */
  readonly title = input.required<string>();
  /** Drives the error alert banner — owned by the page (set via showError). */
  readonly showAlert = input(false);
  readonly alertMessage = input("");
  /** Heading for the submission success dialog. */
  readonly successTitle = input("Workflow Submitted Successfully");
  /** Emitted when the user dismisses the error alert. */
  readonly alertDismissed = output<void>();

  readonly auth = inject(AuthService);
  readonly workflowSubmission = inject(WorkflowSubmissionService);
  readonly profileUrl = environment.profileUrl;

  readonly tabs: WorkflowTabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "output", label: "Output" },
    { id: "papers", label: "Papers" },
  ];
  private readonly activeTab = signal<WorkflowTabItem["id"]>("overview");
  isActiveTab = (id: WorkflowTabItem["id"]): boolean => this.activeTab() === id;
  switchTab(id: WorkflowTabItem["id"]): void {
    this.activeTab.set(id);
  }

  loginWithReturnUrl(): void {
    const currentUrl = window.location.pathname + window.location.search;
    this.auth.login(currentUrl);
  }

  goToJobs(): void {
    this.workflowSubmission.goToJobs();
  }

  submitNewJob(): void {
    window.location.reload();
  }
}
