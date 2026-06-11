import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { JobResultsComponent } from "../../components/job-results/job-results.component";
import { LoadingComponent } from "../../components/loading/loading.component";
import {
  JobListItem,
  JobListQueryParams,
  JobsService,
} from "../../cores/services/jobs.service";
import { DatePipe } from "@angular/common";
import { EMPTY } from "rxjs";
import { catchError } from "rxjs/operators";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroTrash,
  heroMagnifyingGlass,
  heroChevronDown,
  heroClock,
  heroChevronLeft,
  heroChevronRight,
  heroExclamationTriangle,
  heroArrowUp,
  heroArrowDown,
} from "@ng-icons/heroicons/outline";

@Component({
  selector: "app-jobs",
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    JobResultsComponent,
    LoadingComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroTrash,
      heroMagnifyingGlass,
      heroChevronDown,
      heroClock,
      heroChevronLeft,
      heroChevronRight,
      heroExclamationTriangle,
      heroArrowUp,
      heroArrowDown,
    }),
  ],
  templateUrl: "./jobs.html",
})
export default class JobsComponent implements OnInit {
  private jobsService = inject(JobsService);

  // Expose Math to template
  Math = Math;

  // State signals
  jobs = signal<JobListItem[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedJobs = signal<string[]>([]);
  showDeleteDialog = signal(false);
  showJobDetailsDialog = signal(false);
  showStatusDropdown = signal(false);
  bulkDeleting = signal(false);
  selectedJobDetails = signal<JobListItem | null>(null);

  // Filter and pagination state
  searchQuery = signal<string>("");
  selectedStatuses = signal<string[]>([]);
  currentPage = signal<number>(1);
  pageSize = signal<number>(50);
  scoreSortDirection = signal<"none" | "asc" | "desc">("none");
  submittedSortDirection = signal<"asc" | "desc">("desc");

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
      offset: (this.currentPage() - 1) * this.pageSize(),
    };

    if (this.searchQuery()) {
      params.search = this.searchQuery();
    }

    if (this.selectedStatuses().length > 0) {
      params.status = this.selectedStatuses();
    }

    this.jobsService
      .listJobs(params)
      .pipe(
        catchError((err) => {
          console.error("Error loading jobs:", err);
          this.error.set("Failed to load jobs. Please try again.");
          this.loading.set(false);
          return EMPTY;
        })
      )
      .subscribe((response) => {
        const normalizedJobs = response.jobs.map((job) => {
          const rawJob = job as JobListItem & {
            final_design_count?: number | null;
            workflow_name?: string | null;
          };
          return {
            ...job,
            finalDesignCount:
              rawJob.finalDesignCount ?? rawJob.final_design_count ?? null,
            workflow: rawJob.workflow ?? rawJob.workflow_name ?? "",
          };
        });
        this.jobs.set(this.sortJobs(normalizedJobs));
        this.total.set(response.total);
        this.loading.set(false);
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

  toggleScoreSort(): void {
    const current = this.scoreSortDirection();
    const next =
      current === "none" ? "desc" : current === "desc" ? "asc" : "none";
    this.scoreSortDirection.set(next);
    this.jobs.set(this.sortJobs(this.jobs()));
  }

  toggleSubmittedSort(): void {
    const current = this.submittedSortDirection();
    this.submittedSortDirection.set(current === "desc" ? "asc" : "desc");
    this.jobs.set(this.sortJobs(this.jobs()));
  }

  private sortJobs(jobs: JobListItem[]): JobListItem[] {
    const direction = this.scoreSortDirection();
    if (direction !== "none") {
      return [...jobs].sort((a, b) => {
        const aScore = a.score;
        const bScore = b.score;

        if (aScore === null && bScore === null) {
          return this.compareSubmittedAt(a, b);
        }
        if (aScore === null) return 1;
        if (bScore === null) return -1;

        const scoreComparison =
          direction === "asc" ? aScore - bScore : bScore - aScore;

        return scoreComparison !== 0
          ? scoreComparison
          : this.compareSubmittedAt(a, b);
      });
    }

    return [...jobs].sort((a, b) => {
      return this.compareSubmittedAt(a, b);
    });
  }

  private compareSubmittedAt(a: JobListItem, b: JobListItem): number {
    const aSubmittedAt = new Date(a.submittedAt).getTime();
    const bSubmittedAt = new Date(b.submittedAt).getTime();
    const submittedComparison = aSubmittedAt - bSubmittedAt;

    return this.submittedSortDirection() === "asc"
      ? submittedComparison
      : -submittedComparison;
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

  closeJobDetailsDialog(): void {
    this.showJobDetailsDialog.set(false);
    this.selectedJobDetails.set(null);
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
      },
    });
  }

  viewJobDetails(job: JobListItem): void {
    this.selectedJobDetails.set(job);
    this.showJobDetailsDialog.set(true);
  }

  deleteSelectedJobFromDetails(): void {
    const job = this.selectedJobDetails();
    if (!job) {
      return;
    }

    this.openDeleteDialogFor(job.id);
    this.closeJobDetailsDialog();
  }
}
