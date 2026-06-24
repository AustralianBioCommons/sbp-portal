import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { provideRouter, Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { ResultsService } from "../../cores/services/results.service";
import JobsComponent from "./jobs";
import {
  JobListItem,
  JobListResponse,
  JobsService,
} from "../../cores/services/jobs.service";

describe("JobsComponent", () => {
  let component: JobsComponent;
  let fixture: ComponentFixture<JobsComponent>;
  let mockJobsService: jasmine.SpyObj<JobsService>;
  let mockResultsService: jasmine.SpyObj<ResultsService>;
  let sanitizer: DomSanitizer;

  const mockJob: JobListItem = {
    id: "job-1",
    jobName: "Example job",
    tool: "Binder design",
    workflow: "",
    status: "In progress",
    submittedAt: "2026-03-12T10:00:00Z",
    score: 0.95,
    finalDesignCount: 3,
  };

  const secondJob: JobListItem = {
    id: "job-2",
    jobName: "Queued job",
    tool: "",
    workflow: "",
    status: "In queue",
    submittedAt: "2026-03-12T11:00:00Z",
    score: null,
    finalDesignCount: null,
  };

  const mockResponse: JobListResponse = {
    jobs: [mockJob],
    total: 1,
    limit: 50,
    offset: 0,
  };

  const detectComponentChanges = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockJobsService = jasmine.createSpyObj("JobsService", [
      "listJobs",
      "cancelJob",
      "bulkDeleteJobs",
    ]);
    mockResultsService = jasmine.createSpyObj("ResultsService", [
      "getJobReport",
      "getJobDownloads",
      "getJobSettingParams",
      "getJobLogs",
    ]);
    mockJobsService.listJobs.and.returnValue(of(mockResponse));
    mockJobsService.cancelJob.and.returnValue(
      of({ message: "Cancelled", runId: mockJob.id, status: "Stopped" })
    );
    mockJobsService.bulkDeleteJobs.and.returnValue(
      of({ deleted: [mockJob.id], failed: {} })
    );
    await TestBed.configureTestingModule({
      imports: [JobsComponent],
      providers: [
        { provide: JobsService, useValue: mockJobsService },
        { provide: ResultsService, useValue: mockResultsService },
        provideRouter([]),
      ],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
    mockResultsService.getJobReport.and.returnValue(
      of(
        sanitizer.bypassSecurityTrustResourceUrl(
          "https://example.test/report.html"
        )
      )
    );
    mockResultsService.getJobDownloads.and.returnValue(
      of({ runId: mockJob.id, downloads: [] })
    );
    mockResultsService.getJobSettingParams.and.returnValue(
      of({ runId: mockJob.id, settingParams: { binder_name: "PDL1" } })
    );
    mockResultsService.getJobLogs.and.returnValue(
      of({ runId: mockJob.id, logs: [], entries: [], formattedEntries: [] })
    );

    fixture = TestBed.createComponent(JobsComponent);
    component = fixture.componentInstance;
    await detectComponentChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load jobs on init", () => {
    expect(mockJobsService.listJobs).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
    });
    expect(component.jobs()).toEqual([mockJob]);
  });

  it("should sort loaded jobs by submitted time descending by default", () => {
    mockJobsService.listJobs.and.returnValue(
      of({
        jobs: [mockJob, secondJob],
        total: 2,
        limit: 50,
        offset: 0,
      })
    );

    component.loadJobs();

    expect(component.jobs().map((job) => job.id)).toEqual([
      secondJob.id,
      mockJob.id,
    ]);
  });

  it("should normalize snake case final design count values when loading jobs", () => {
    mockJobsService.listJobs.and.returnValue(
      of({
        jobs: [
          {
            ...mockJob,
            finalDesignCount: undefined,
            final_design_count: 7,
          } as JobListItem & { final_design_count: number },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      })
    );

    component.loadJobs();

    expect(component.jobs()[0].finalDesignCount).toBe(7);
    expect(component.totalFinalDesigns).toBe(7);
  });

  it("should set an error when loading jobs fails", () => {
    mockJobsService.listJobs.and.returnValue(
      throwError(() => new Error("load failed"))
    );

    component.loadJobs();

    expect(component.error()).toBe("Failed to load jobs. Please try again.");
    expect(component.loading()).toBeFalse();
    expect(component.selectedJobs()).toEqual([]);
  });

  it("should search from page one and reload jobs", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();
    component.currentPage.set(3);

    component.onSearch("binder");

    expect(component.searchQuery()).toBe("binder");
    expect(component.currentPage()).toBe(1);
    expect(loadJobsSpy).toHaveBeenCalled();
  });

  it("should include search and selected statuses when loading jobs", () => {
    component.searchQuery.set("binder");
    component.selectedStatuses.set(["Completed", "Failed"]);
    component.currentPage.set(2);

    component.loadJobs();

    expect(mockJobsService.listJobs).toHaveBeenCalledWith({
      limit: 50,
      offset: 50,
      search: "binder",
      status: ["Completed", "Failed"],
    });
  });

  it("should toggle statuses and report selection state", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();

    component.toggleStatus("Completed");
    expect(component.selectedStatuses()).toEqual(["Completed"]);
    expect(component.isStatusSelected("Completed")).toBeTrue();

    component.toggleStatus("Completed");
    expect(component.selectedStatuses()).toEqual([]);
    expect(component.isStatusSelected("Completed")).toBeFalse();
    expect(loadJobsSpy).toHaveBeenCalledTimes(2);
  });

  it("should clear filters and reload jobs", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();
    component.searchQuery.set("abc");
    component.selectedStatuses.set(["Completed"]);
    component.currentPage.set(4);

    component.clearFilters();

    expect(component.searchQuery()).toBe("");
    expect(component.selectedStatuses()).toEqual([]);
    expect(component.currentPage()).toBe(1);
    expect(loadJobsSpy).toHaveBeenCalled();
  });

  it("should paginate backward and forward within bounds", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();
    component.total.set(125);
    component.pageSize.set(50);
    component.currentPage.set(2);

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.nextPage();
    expect(component.currentPage()).toBe(2);

    component.currentPage.set(3);
    component.nextPage();
    expect(component.currentPage()).toBe(3);

    expect(component.totalPages).toBe(3);
    expect(component.hasPreviousPage).toBeTrue();
    expect(component.hasNextPage).toBeFalse();
    expect(loadJobsSpy).toHaveBeenCalledTimes(2);
  });

  it("should sort scores through desc, asc, and none states", () => {
    component.jobs.set([
      { ...mockJob, id: "a", score: 0.4 },
      { ...secondJob, id: "b", score: null },
      { ...mockJob, id: "c", score: 0.9, submittedAt: "2026-03-12T12:00:00Z" },
    ]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("desc");
    expect(component.jobs().map((job) => job.id)).toEqual(["c", "a", "b"]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("asc");
    expect(component.jobs().map((job) => job.id)).toEqual(["a", "c", "b"]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("none");
    expect(component.jobs().map((job) => job.id)).toEqual(["c", "b", "a"]);
  });

  it("should fall back to submittedAt order when both scores are null during score sort", () => {
    component.jobs.set([
      { ...mockJob, id: "a", score: null, submittedAt: "2026-03-12T11:00:00Z" },
      {
        ...secondJob,
        id: "b",
        score: null,
        submittedAt: "2026-03-12T10:00:00Z",
      },
      { ...mockJob, id: "c", score: 0.8, submittedAt: "2026-03-12T09:00:00Z" },
    ]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("desc");
    // c has the only score so comes first; a and b both null → sorted by submittedAt desc
    expect(component.jobs().map((job) => job.id)).toEqual(["c", "a", "b"]);
  });

  it("should sort submitted time through desc and asc states", () => {
    component.jobs.set([
      { ...mockJob, id: "a", submittedAt: "2026-03-12T10:00:00Z" },
      { ...secondJob, id: "b", submittedAt: "2026-03-12T12:00:00Z" },
      { ...mockJob, id: "c", submittedAt: "2026-03-12T11:00:00Z" },
    ]);

    expect(component.jobs().map((job) => job.id)).toEqual(["a", "b", "c"]);

    component.toggleSubmittedSort();
    expect(component.submittedSortDirection()).toBe("asc");
    expect(component.jobs().map((job) => job.id)).toEqual(["a", "c", "b"]);

    component.toggleSubmittedSort();
    expect(component.submittedSortDirection()).toBe("desc");
    expect(component.jobs().map((job) => job.id)).toEqual(["b", "c", "a"]);
  });

  it("should return status classes and helpers", () => {
    expect(component.getStatusClass("Completed")).toBe(
      "bg-green-100 text-green-800"
    );
    expect(component.getStatusClass("In progress")).toBe("text-gray-700");
    expect(component.getStatusClass("In queue")).toBe(
      "bg-white text-black border border-black"
    );
    expect(component.getStatusClass("Failed")).toBe("bg-red-600 text-white");
    expect(component.getStatusClass("Stopped")).toBe(
      "bg-amber-100 text-red-700"
    );
    expect(component.getStatusClass("Unknown")).toBe(
      "bg-gray-100 text-gray-900"
    );
    expect(component.isInProgress("In progress")).toBeTrue();
  });

  it("should toggle individual and all job selections", () => {
    component.jobs.set([mockJob, secondJob]);

    component.toggleJob(mockJob.id);
    expect(component.isJobSelected(mockJob.id)).toBeTrue();

    component.toggleJob(mockJob.id);
    expect(component.isJobSelected(mockJob.id)).toBeFalse();

    component.toggleAllJobs();
    expect(component.selectedJobs()).toEqual([mockJob.id, secondJob.id]);
    expect(component.isAllSelected()).toBeTrue();

    component.toggleAllJobs();
    expect(component.selectedJobs()).toEqual([]);
    expect(component.isAllSelected()).toBeFalse();
  });

  it("should manage delete dialog visibility", () => {
    component.openDeleteDialog();
    expect(component.showDeleteDialog()).toBeFalse();

    component.selectedJobs.set([mockJob.id]);
    component.openDeleteDialog();
    expect(component.showDeleteDialog()).toBeTrue();

    component.closeDeleteDialog();
    expect(component.showDeleteDialog()).toBeFalse();

    component.openDeleteDialogFor(secondJob.id);
    expect(component.selectedJobs()).toEqual([secondJob.id]);
    expect(component.showDeleteDialog()).toBeTrue();
  });

  it("should navigate to the job detail page when viewing job details", () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, "navigate");

    component.viewJobDetails(mockJob);

    expect(navigateSpy).toHaveBeenCalledWith(["/jobs", mockJob.id], {
      state: { job: mockJob, seqeraUnavailable: false },
    });
  });

  it("should toggle the status dropdown", () => {
    component.toggleStatusDropdown();
    expect(component.showStatusDropdown()).toBeTrue();

    component.toggleStatusDropdown();
    expect(component.showStatusDropdown()).toBeFalse();
  });

  it("should clear selection and close the delete dialog when no jobs are selected", () => {
    const closeDeleteDialogSpy = spyOn(
      component,
      "closeDeleteDialog"
    ).and.callThrough();

    component.confirmDelete();

    expect(mockJobsService.bulkDeleteJobs).not.toHaveBeenCalled();
    expect(closeDeleteDialogSpy).toHaveBeenCalled();
    expect(component.bulkDeleting()).toBeFalse();
  });

  it("should confirm delete and reload jobs", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();
    const closeDeleteDialogSpy = spyOn(
      component,
      "closeDeleteDialog"
    ).and.callThrough();
    component.selectedJobs.set([mockJob.id, secondJob.id]);
    mockJobsService.bulkDeleteJobs.and.returnValue(
      of({ deleted: [mockJob.id], failed: {} })
    );

    component.confirmDelete();

    expect(mockJobsService.bulkDeleteJobs).toHaveBeenCalledWith([
      mockJob.id,
      secondJob.id,
    ]);
    expect(component.selectedJobs()).toEqual([]);
    expect(component.bulkDeleting()).toBeFalse();
    expect(loadJobsSpy).toHaveBeenCalled();
    expect(closeDeleteDialogSpy).toHaveBeenCalled();
    expect(component.error()).toBeNull();
  });

  it("should surface partial delete failures", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();
    component.selectedJobs.set([mockJob.id, secondJob.id]);
    mockJobsService.bulkDeleteJobs.and.returnValue(
      of({ deleted: [mockJob.id], failed: { [secondJob.id]: "failed" } })
    );

    component.confirmDelete();

    expect(component.error()).toBe("Failed to delete 1 job.");
    expect(component.bulkDeleting()).toBeFalse();
    expect(loadJobsSpy).toHaveBeenCalled();
  });

  it("should handle delete request failures", () => {
    mockJobsService.bulkDeleteJobs.and.returnValue(
      throwError(() => new Error("delete failed"))
    );
    component.selectedJobs.set([mockJob.id]);

    component.confirmDelete();

    expect(component.error()).toBe("Failed to delete jobs. Please try again.");
    expect(component.bulkDeleting()).toBeFalse();
    expect(component.showDeleteDialog()).toBeFalse();
  });
});
