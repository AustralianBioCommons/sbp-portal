import { ViewportScroller } from "@angular/common";
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { provideRouter, Router } from "@angular/router";
import { Observable, of, throwError } from "rxjs";
import { ResultsService } from "../services/results.service";
import { AuthService } from "../../../core/services/auth.service";
import JobsListComponent from "./jobs-list";
import {
  JobListItem,
  JobListResponse,
  JobsService,
} from "../services/jobs.service";
import {
  ComponentsHealthResponse,
  HealthService,
} from "../services/health.service";

describe("JobsListComponent", () => {
  let component: JobsListComponent;
  let fixture: ComponentFixture<JobsListComponent>;
  let mockJobsService: jasmine.SpyObj<JobsService>;
  let mockResultsService: jasmine.SpyObj<ResultsService>;
  let mockHealthService: jasmine.SpyObj<HealthService>;
  let mockAuthService: {
    isLoading$: Observable<boolean>;
    isAuthenticated$: Observable<boolean>;
    canExecuteWorkflows$: Observable<boolean>;
    login: jasmine.Spy;
  };

  const healthyResponse: ComponentsHealthResponse = {
    overallStatus: "healthy",
    checkedAt: "2026-06-25T03:12:55Z",
    message: null,
  };
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
    mockHealthService = jasmine.createSpyObj("HealthService", [
      "getComponentsHealth",
    ]);
    mockHealthService.getComponentsHealth.and.returnValue(of(healthyResponse));
    mockAuthService = {
      isLoading$: of(false),
      isAuthenticated$: of(true),
      canExecuteWorkflows$: of(true),
      login: jasmine.createSpy("login"),
    };
    mockJobsService.listJobs.and.returnValue(of(mockResponse));
    mockJobsService.cancelJob.and.returnValue(
      of({ message: "Cancelled", runId: mockJob.id, status: "Stopped" })
    );
    mockJobsService.bulkDeleteJobs.and.returnValue(
      of({ deleted: [mockJob.id], failed: {} })
    );
    await TestBed.configureTestingModule({
      imports: [JobsListComponent],
      providers: [
        { provide: JobsService, useValue: mockJobsService },
        { provide: ResultsService, useValue: mockResultsService },
        { provide: HealthService, useValue: mockHealthService },
        { provide: AuthService, useValue: mockAuthService },
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

    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    await detectComponentChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("does not flag a warning when all components are healthy", () => {
    expect(mockHealthService.getComponentsHealth).toHaveBeenCalled();
    expect(component.systemUnhealthy()).toBeFalse();
    expect(component.healthMessage()).toBeNull();
  });

  it("flags a warning with the backend message when a component is not healthy", async () => {
    mockHealthService.getComponentsHealth.and.returnValue(
      of({
        overallStatus: "degraded",
        checkedAt: "2026-06-25T03:12:55Z",
        message: "Some workflow services are currently unavailable.",
      })
    );

    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    await detectComponentChanges();

    expect(component.systemUnhealthy()).toBeTrue();
    expect(component.healthMessage()).toBe(
      "Some workflow services are currently unavailable."
    );
  });

  it("does not surface a warning when the health check fails", async () => {
    mockHealthService.getComponentsHealth.and.returnValue(
      throwError(() => new Error("network error"))
    );

    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    await detectComponentChanges();

    expect(component.systemUnhealthy()).toBeFalse();
    expect(component.healthMessage()).toBeNull();
  });

  it("should load jobs on init", () => {
    expect(mockJobsService.listJobs).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      sortBy: "submitted",
      sortOrder: "desc",
    });
    expect(component.jobs()).toEqual([mockJob]);
  });

  it("should not re-sort jobs client-side, since the backend returns them pre-sorted", () => {
    mockJobsService.listJobs.and.returnValue(
      of({
        jobs: [secondJob, mockJob],
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

  describe("URL state", () => {
    let router: Router;
    const lastListParams = () =>
      mockJobsService.listJobs.calls.mostRecent().args[0];
    const navigateTo = async (url: string) => {
      await router.navigateByUrl(url);
      await detectComponentChanges();
    };

    beforeEach(() => {
      router = TestBed.inject(Router);
      // Three pages, so page params in these tests are in range
      mockJobsService.listJobs.and.returnValue(
        of({ ...mockResponse, total: 25 })
      );
    });

    it("should load the page, search, statuses and sort from the URL", async () => {
      await navigateTo(
        "/?page=2&search=pdl1&status=Failed&status=Stopped&sort=score&order=asc"
      );

      expect(lastListParams()).toEqual({
        limit: 10,
        offset: 10,
        search: "pdl1",
        status: ["Failed", "Stopped"],
        sortBy: "score",
        sortOrder: "asc",
      });
    });

    it("should fall back to defaults for invalid URL values", async () => {
      await navigateTo("/?page=abc&status=Bogus&sort=name&order=up");

      expect(lastListParams()).toEqual({
        limit: 10,
        offset: 0,
        sortBy: "submitted",
        sortOrder: "desc",
      });
    });

    it("should move to the last page when the URL page is past the end", async () => {
      mockJobsService.listJobs.and.callFake((params) =>
        of({
          ...mockResponse,
          jobs: (params?.offset ?? 0) >= 20 ? [] : [mockJob],
          total: 15,
        })
      );

      await navigateTo("/?page=5");
      await detectComponentChanges();

      expect(router.url).toBe("/?page=2");
      expect(lastListParams()?.offset).toBe(10);
    });

    it("should write the search to the URL from page one after debounce", fakeAsync(() => {
      router.navigateByUrl("/?page=3");
      tick();
      const calls = mockJobsService.listJobs.calls.count();

      component.onSearch("binder");
      expect(component.searchQuery()).toBe("binder");
      tick(299);
      expect(mockJobsService.listJobs.calls.count()).toBe(calls);

      tick(1);
      tick();
      expect(router.url).toBe("/?search=binder");
      expect(lastListParams()).toEqual(
        jasmine.objectContaining({ search: "binder", offset: 0 })
      );
    }));

    it("should debounce rapid search input into a single reload", fakeAsync(() => {
      const calls = mockJobsService.listJobs.calls.count();

      component.onSearch("b");
      tick(100);
      component.onSearch("bi");
      tick(100);
      component.onSearch("bind");
      tick(300);
      tick();

      expect(router.url).toBe("/?search=bind");
      expect(mockJobsService.listJobs.calls.count()).toBe(calls + 1);
    }));

    it("should write toggled statuses to the URL from page one", async () => {
      await navigateTo("/?page=2");

      component.toggleStatus("Completed");
      await detectComponentChanges();
      expect(router.url).toBe("/?status=Completed");
      expect(component.isStatusSelected("Completed")).toBeTrue();

      component.toggleStatus("Completed");
      await detectComponentChanges();
      expect(router.url).toBe("/");
      expect(component.isStatusSelected("Completed")).toBeFalse();
    });

    it("should clear filters from the URL, including an unsubmitted search", async () => {
      await navigateTo("/?page=4&status=Completed");
      component.onSearch("abc");

      component.clearFilters();
      await detectComponentChanges();

      expect(router.url).toBe("/");
      expect(component.searchQuery()).toBe("");
      expect(component.selectedStatuses()).toEqual([]);
      expect(component.currentPage()).toBe(1);
    });

    it("should paginate within bounds, scroll smoothly to the top and keep focus on the table", async () => {
      await navigateTo("/?page=2");
      const navigateSpy = spyOn(router, "navigate").and.callThrough();
      const scrollSpy = spyOn(
        TestBed.inject(ViewportScroller),
        "scrollToPosition"
      );

      component.previousPage();
      await detectComponentChanges();
      expect(router.url).toBe("/");
      expect(scrollSpy).toHaveBeenCalledWith([0, 0], { behavior: "smooth" });

      component.previousPage();
      expect(navigateSpy).toHaveBeenCalledTimes(1);

      component.nextPage();
      expect(document.activeElement).toBe(
        fixture.nativeElement.querySelector("table")
      );
      await detectComponentChanges();
      expect(router.url).toBe("/?page=2");

      await navigateTo("/?page=3");
      component.nextPage();
      expect(component.hasNextPage).toBeFalse();
      expect(navigateSpy).toHaveBeenCalledTimes(2);
      expect(scrollSpy).toHaveBeenCalledTimes(2);
    });

    it("should flip the active sort and write it to the URL from page one", async () => {
      await navigateTo("/?page=3");

      component.toggleScoreSort();
      await detectComponentChanges();
      expect(router.url).toBe("/?sort=score");
      expect(lastListParams()).toEqual(
        jasmine.objectContaining({
          sortBy: "score",
          sortOrder: "desc",
          offset: 0,
        })
      );

      component.toggleScoreSort();
      await detectComponentChanges();
      expect(router.url).toBe("/?sort=score&order=asc");
    });

    it("should keep each column's direction when switching sorts", async () => {
      component.toggleSubmittedSort();
      await detectComponentChanges();
      expect(router.url).toBe("/?order=asc");

      component.toggleScoreSort();
      await detectComponentChanges();
      expect(router.url).toBe("/?sort=score");

      component.toggleSubmittedSort();
      await detectComponentChanges();
      expect(router.url).toBe("/?order=asc");
    });

    it("should pass the list's query params to the job detail page", async () => {
      await navigateTo("/?page=2&status=Failed");
      const navigateSpy = spyOn(router, "navigate");

      component.viewJobDetails(mockJob);

      expect(navigateSpy).toHaveBeenCalledWith(["/my-jobs", mockJob.id], {
        state: {
          job: mockJob,
          jobsListQueryParams: { page: "2", status: "Failed" },
        },
      });
    });
  });

  it("should include search and selected statuses when loading jobs", () => {
    component.searchQuery.set("binder");
    component.selectedStatuses.set(["Completed", "Failed"]);
    component.currentPage.set(2);

    component.loadJobs();

    expect(mockJobsService.listJobs).toHaveBeenCalledWith({
      limit: 10,
      offset: 10,
      search: "binder",
      status: ["Completed", "Failed"],
      sortBy: "submitted",
      sortOrder: "desc",
    });
  });

  it("should send the active sort field and direction to the API", () => {
    component.activeSort.set("score");
    component.scoreSortDirection.set("asc");

    component.loadJobs();

    expect(mockJobsService.listJobs).toHaveBeenCalledWith(
      jasmine.objectContaining({ sortBy: "score", sortOrder: "asc" })
    );
  });

  it("should expose every status the backend can return as a filter option", () => {
    expect(component.statusOptions).toEqual([
      "Staging",
      "Pending",
      "In queue",
      "In progress",
      "Completed",
      "Failed",
      "Stopped",
    ]);
  });

  it("should return status classes and helpers", () => {
    expect(component.getStatusClass("Completed")).toBe(
      "bg-green-100 text-green-800"
    );
    expect(component.getStatusClass("Staging")).toBe(
      "bg-indigo-100 text-indigo-800"
    );
    expect(component.getStatusClass("Pending")).toBe("bg-sky-100 text-sky-800");
    expect(component.getStatusClass("In progress")).toBe(
      "bg-blue-100 text-blue-800"
    );
    expect(component.getStatusClass("In queue")).toBe(
      "bg-gray-100 text-gray-800"
    );
    expect(component.getStatusClass("Failed")).toBe("bg-red-100 text-red-800");
    expect(component.getStatusClass("Stopped")).toBe(
      "bg-amber-100 text-amber-800"
    );
    expect(component.getStatusClass("Unknown")).toBe(
      "bg-gray-100 text-gray-800"
    );
  });

  it("should normalize tool casing regardless of how the API sent it", () => {
    expect(component.getToolName("rfdiffusion")).toBe("RFdiffusion");
    expect(component.getToolName("Bindcraft")).toBe("BindCraft");
    expect(component.getToolName("Colabfold")).toBe("ColabFold");
    expect(component.getToolName("boltz")).toBe("Boltz");
    expect(component.getToolName("")).toBe("");
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

    expect(navigateSpy).toHaveBeenCalledWith(["/my-jobs", mockJob.id], {
      state: { job: mockJob, jobsListQueryParams: {} },
    });
  });

  it("should open a job from the keyboard without scrolling the page", () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, "navigate");
    const space = new KeyboardEvent("keydown", { key: " ", cancelable: true });

    component.openJobFromKey(mockJob, space);

    expect(space.defaultPrevented).toBeTrue();
    expect(navigateSpy).toHaveBeenCalledWith(["/my-jobs", mockJob.id], {
      state: { job: mockJob, jobsListQueryParams: {} },
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
