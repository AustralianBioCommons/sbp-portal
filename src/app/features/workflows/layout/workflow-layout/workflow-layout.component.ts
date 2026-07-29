import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from "@angular/core";
import { AlertComponent } from "../../../../components/alert/alert.component";
import { ButtonComponent } from "../../../../components/button/button.component";
import { DialogComponent } from "../../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { environment } from "../../../../../environments/environment";
import { AuthService } from "../../../../core/services/auth.service";
import { WorkflowSubmissionService } from "../../services/workflow-submission.service";

export interface WorkflowTabItem {
  id: "execute" | "about" | "output" | "papers";
  label: string;
  shortLabel?: string;
}

/**
 * Shared chrome for every workflow page: background, tab nav, title block,
 * access-restricted overlay, example-output/papers panels, loading overlay and
 * the submission success dialog. Each page projects its `app-workflow-form`
 * into the default slot, the subtitle and About description into `[description]`
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
  readonly heading = input.required<string>();
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
    { id: "execute", label: "Execute" },
    { id: "about", label: "About" },
    { id: "output", label: "Example Output", shortLabel: "Output" },
    { id: "papers", label: "Papers" },
  ];
  private readonly activeTab = signal<WorkflowTabItem["id"]>("execute");
  private readonly tabButtons =
    viewChildren<ElementRef<HTMLButtonElement>>("tabButton");

  isActiveTab = (id: WorkflowTabItem["id"]): boolean => this.activeTab() === id;
  tabId = (id: WorkflowTabItem["id"]): string => `workflow-tab-${id}`;
  panelId = (id: WorkflowTabItem["id"]): string => `workflow-panel-${id}`;

  switchTab(id: WorkflowTabItem["id"]): void {
    this.activeTab.set(id);
  }

  /**
   * Keyboard support for the tablist
   */
  onTabListKeydown(event: KeyboardEvent): void {
    const last = this.tabs.length - 1;
    const current = this.tabs.findIndex((tab) => this.isActiveTab(tab.id));
    let next: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = current === last ? 0 : current + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = current === 0 ? last : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.switchTab(this.tabs[next].id);
    this.tabButtons()[next]?.nativeElement.focus();
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
