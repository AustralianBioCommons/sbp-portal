import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  viewChildren,
  ChangeDetectionStrategy,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { map } from "rxjs";
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
 * Papers content via `[papers]` and its example output via `[output]`.
 * The open tab is kept in the `?tab=` query param, so a refresh or shared link
 * reopens it.
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
  changeDetection: ChangeDetectionStrategy.Eager,
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tabs: WorkflowTabItem[] = [
    { id: "execute", label: "Execute" },
    { id: "about", label: "About" },
    { id: "output", label: "Example Output", shortLabel: "Output" },
    { id: "papers", label: "Papers" },
  ];
  private readonly tabParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get("tab"))),
    { requireSync: true }
  );
  /** Follows the URL, and is set directly on a click so the switch doesn't wait for navigation. */
  private readonly activeTab = linkedSignal(() =>
    this.toTabId(this.tabParam())
  );
  private readonly tabButtons =
    viewChildren<ElementRef<HTMLButtonElement>>("tabButton");

  isActiveTab = (id: WorkflowTabItem["id"]): boolean => this.activeTab() === id;
  tabId = (id: WorkflowTabItem["id"]): string => `workflow-tab-${id}`;
  panelId = (id: WorkflowTabItem["id"]): string => `workflow-panel-${id}`;

  switchTab(id: WorkflowTabItem["id"]): void {
    this.activeTab.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: id === "execute" ? null : id },
      queryParamsHandling: "merge",
      replaceUrl: true,
      scroll: "manual",
    });
  }

  /** Unknown values fall back to Execute, the default tab. */
  private toTabId(param: string | null): WorkflowTabItem["id"] {
    return this.tabs.find((tab) => tab.id === param)?.id ?? "execute";
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
