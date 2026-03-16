import { CommonModule } from "@angular/common";
import { Component, inject, NgZone, OnDestroy, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { JobsActionMenuComponent } from "../../components/jobs-action-menu/jobs-action-menu.component";
import {
  JobListItem,
  JobListQueryParams,
  JobsService
} from "../../cores/services/jobs.service";
import { formatDateTimeForJobs } from "../../cores/utils/date.utils";

@Component({
  selector: "app-jobs",
  standalone: true,
  imports: [CommonModule, FormsModule, JobsActionMenuComponent],
  templateUrl: "./jobs.html"
})
export class JobsComponent implements OnInit, OnDestroy {
  private jobsService = inject(JobsService);
  private ngZone = inject(NgZone);
  private viewportListeners: (() => void)[] = [];

  // Expose Math to template
  Math = Math;

  // State signals
  jobs = signal<JobListItem[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedJobs = signal<string[]>([]);
  showDeleteDialog = signal(false);
  showStatusDropdown = signal(false);
  actionLoading = signal<Record<string, boolean>>({});
  bulkDeleting = signal(false);
  openActionMenuId = signal<string | null>(null);
  actionMenuStyle = signal<Record<string, string>>({});

  // Filter and pagination state
  searchQuery = signal<string>("");
  selectedStatuses = signal<string[]>([]);
  currentPage = signal<number>(1);
  pageSize = signal<number>(50);
  scoreSortDirection = signal<"none" | "asc" | "desc">("none");

  // Available status options
  statusOptions = ["Completed", "Failed", "Stopped", "In progress", "In queue"];

  ngOnInit(): void {
    this.loadJobs();
  }

  /**
   * Load jobs from the API
   */
  loadJobs(): void {
    this.loading.set(true);
    this.error.set(null);
    this.selectedJobs.set([]); // Clear selection when reloading

    const params: JobListQueryParams = {
      limit: this.pageSize(),
      offset: (this.currentPage() - 1) * this.pageSize()
    };

    if (this.searchQuery()) {
      params.search = this.searchQuery();
    }

    if (this.selectedStatuses().length > 0) {
      params.status = this.selectedStatuses();
    }

    this.jobsService.listJobs(params).subscribe({
      next: (response) => {
        const normalizedJobs = response.jobs.map((job) => {
          const rawJob = job as JobListItem & { final_design_count?: number | null };
          return {
            ...job,
            finalDesignCount:
              rawJob.finalDesignCount ?? rawJob.final_design_count ?? null
          };
        });
        this.jobs.set(this.sortJobsByScore(normalizedJobs));
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error("Error loading jobs:", err);
        this.error.set("Failed to load jobs. Please try again.");
        this.loading.set(false);
      }
    });
  }

  /**
   * Handle search input
   */
  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1); // Reset to first page
    this.loadJobs();
  }

  /**
   * Toggle status filter
   */
  toggleStatus(status: string): void {
    const current = this.selectedStatuses();
    if (current.includes(status)) {
      this.selectedStatuses.set(current.filter((s) => s !== status));
    } else {
      this.selectedStatuses.set([...current, status]);
    }
    this.currentPage.set(1); // Reset to first page
    this.loadJobs();
  }

  /**
   * Check if a status is selected
   */
  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchQuery.set("");
    this.selectedStatuses.set([]);
    this.currentPage.set(1);
    this.loadJobs();
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
      this.loadJobs();
    }
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    const totalPages = Math.ceil(this.total() / this.pageSize());
    if (this.currentPage() < totalPages) {
      this.currentPage.update((page) => page + 1);
      this.loadJobs();
    }
  }

  /**
   * Get total number of pages
   */
  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize());
  }

  /**
   * Check if there's a previous page
   */
  get hasPreviousPage(): boolean {
    return this.currentPage() > 1;
  }

  /**
   * Check if there's a next page
   */
  get hasNextPage(): boolean {
    return this.currentPage() < this.totalPages;
  }

  get totalFinalDesigns(): number {
    return this.jobs().reduce(
      (sum, job) => sum + (job.finalDesignCount ?? 0),
      0
    );
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return formatDateTimeForJobs(dateString);
  }

  toggleScoreSort(): void {
    const current = this.scoreSortDirection();
    const next = current === "none" ? "desc" : current === "desc" ? "asc" : "none";
    this.scoreSortDirection.set(next);
    this.jobs.set(this.sortJobsByScore(this.jobs()));
  }

  private sortJobsByScore(jobs: JobListItem[]): JobListItem[] {
    const direction = this.scoreSortDirection();
    if (direction === "none") {
      return [...jobs];
    }

    return [...jobs].sort((a, b) => {
      const aScore = a.score;
      const bScore = b.score;

      if (aScore === null && bScore === null) return 0;
      if (aScore === null) return 1;
      if (bScore === null) return -1;

      return direction === "asc" ? aScore - bScore : bScore - aScore;
    });
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(status: string): string {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In progress":
        return "text-gray-700";
      case "In queue":
        return "bg-white text-black border border-black";
      case "Failed":
        return "bg-red-600 text-white";
      case "Stopped":
        return "bg-yellow-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  isInProgress(status: string): boolean {
    return status === "In progress";
  }

  isCancelable(status: string): boolean {
    return status === "In progress" || status === "In queue";
  }

  isActionLoading(jobId: string): boolean {
    return Boolean(this.actionLoading()[jobId]);
  }

  private setActionLoading(jobId: string, loading: boolean): void {
    this.actionLoading.update((current) => ({
      ...current,
      [jobId]: loading
    }));
  }

  /**
   * Toggle selection for a single job
   */
  toggleJob(jobId: string): void {
    const current = this.selectedJobs();
    if (current.includes(jobId)) {
      this.selectedJobs.set(current.filter((id) => id !== jobId));
    } else {
      this.selectedJobs.set([...current, jobId]);
    }
  }

  /**
   * Check if a job is selected
   */
  isJobSelected(jobId: string): boolean {
    return this.selectedJobs().includes(jobId);
  }

  /**
   * Toggle selection for all visible jobs
   */
  toggleAllJobs(): void {
    const allJobIds = this.jobs().map((job) => job.id);
    if (this.isAllSelected()) {
      // Deselect all
      this.selectedJobs.set([]);
    } else {
      // Select all visible jobs
      this.selectedJobs.set(allJobIds);
    }
  }

  /**
   * Check if all visible jobs are selected
   */
  isAllSelected(): boolean {
    const allJobIds = this.jobs().map((job) => job.id);
    return (
      allJobIds.length > 0 &&
      allJobIds.every((id) => this.selectedJobs().includes(id))
    );
  }

  /**
   * Open delete confirmation dialog
   */
  openDeleteDialog(): void {
    if (this.selectedJobs().length === 0) return;
    this.showDeleteDialog.set(true);
  }

  openDeleteDialogFor(jobId: string): void {
    this.selectedJobs.set([jobId]);
    this.showDeleteDialog.set(true);
  }

  /**
   * Close delete confirmation dialog
   */
  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
  }

  /**
   * Toggle status dropdown visibility
   */
  toggleStatusDropdown(): void {
    this.showStatusDropdown.update((v) => !v);
  }

  /**
   * Close status dropdown
   */
  closeStatusDropdown(): void {
    this.showStatusDropdown.set(false);
  }

  toggleActionMenu(jobId: string, trigger?: HTMLElement | null): void {
    if (this.openActionMenuId() === jobId) {
      this.closeActionMenu();
      return;
    }

    if (this.openActionMenuId()) {
      this.closeActionMenu();
    }

    if (trigger) {
      this.actionMenuStyle.set(this.getActionMenuStyle(trigger));
    }

    this.openActionMenuId.set(jobId);
    this.registerViewportListeners();
  }

  closeActionMenu(): void {
    this.openActionMenuId.set(null);
    this.actionMenuStyle.set({});
    this.unregisterViewportListeners();
  }

  isActionMenuOpen(jobId: string): boolean {
    return this.openActionMenuId() === jobId;
  }

  onViewportChange(): void {
    if (this.openActionMenuId()) {
      this.ngZone.run(() => {
        this.closeActionMenu();
      });
    }
  }

  ngOnDestroy(): void {
    this.unregisterViewportListeners();
  }

  private registerViewportListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const handler = () => this.onViewportChange();
      window.addEventListener("scroll", handler, { passive: true });
      window.addEventListener("resize", handler, { passive: true });
      this.viewportListeners = [
        () => window.removeEventListener("scroll", handler),
        () => window.removeEventListener("resize", handler)
      ];
    });
  }

  private unregisterViewportListeners(): void {
    this.viewportListeners.forEach((fn) => fn());
    this.viewportListeners = [];
  }

  private getActionMenuStyle(trigger: HTMLElement): Record<string, string> {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 140;
    const viewportPadding = 8;

    const left = Math.max(
      viewportPadding,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding)
    );

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight + viewportPadding && rect.top > menuHeight;
    const top = openUpwards ? rect.top - menuHeight - viewportPadding : rect.bottom + viewportPadding;

    return {
      left: `${left}px`,
      top: `${Math.max(viewportPadding, top)}px`
    };
  }

  /**
   * Confirm and delete selected jobs
   */
  confirmDelete(): void {
    const runIds = this.selectedJobs();
    if (runIds.length === 0) {
      this.closeDeleteDialog();
      return;
    }

    this.bulkDeleting.set(true);
    this.jobsService.bulkDeleteJobs(runIds).subscribe({
      next: (response) => {
        if (Object.keys(response.failed || {}).length > 0) {
          const failedCount = Object.keys(response.failed).length;
          this.error.set(
            `Failed to delete ${failedCount} job${failedCount > 1 ? "s" : ""}.`
          );
        }
        this.selectedJobs.set([]);
        this.loadJobs();
        this.bulkDeleting.set(false);
        this.closeDeleteDialog();
      },
      error: (err) => {
        console.error("Error deleting jobs:", err);
        this.error.set("Failed to delete jobs. Please try again.");
        this.bulkDeleting.set(false);
        this.closeDeleteDialog();
      }
    });
  }

  cancelJob(job: JobListItem): void {
    if (!this.isCancelable(job.status)) return;

    this.setActionLoading(job.id, true);
    this.jobsService.cancelJob(job.id).subscribe({
      next: () => {
        this.setActionLoading(job.id, false);
        this.loadJobs();
      },
      error: (err) => {
        console.error("Error cancelling job:", err);
        this.error.set("Failed to cancel job. Please try again.");
        this.setActionLoading(job.id, false);
      }
    });
  }

  viewJobDetails(job: JobListItem): void {
    this.closeActionMenu();
    this.error.set(`Job details for "${job.jobName}" are not available yet.`);
  }
}
