import { ComponentFixture, fakeAsync, TestBed, tick } from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { By } from "@angular/platform-browser";
import { of, throwError } from "rxjs";
import { JobResultsComponent } from "../../components/job-results/job-results.component";
import { JobsActionMenuComponent } from "../../components/jobs-action-menu/jobs-action-menu.component";
import { ResultsService } from "../../cores/services/results.service";
import { JobsComponent } from "./jobs";
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
    workflowType: "Binder design",
    status: "In progress",
    submittedAt: "2026-03-12T10:00:00Z",
    score: 0.95,
    finalDesignCount: 3,
  };

  const secondJob: JobListItem = {
    id: "job-2",
    jobName: "Queued job",
    workflowType: null,
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
      "getJobReportResourceUrl",
      "getJobSettingParams",
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
      ],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
    mockResultsService.getJobReportResourceUrl.and.returnValue(
      of(sanitizer.bypassSecurityTrustResourceUrl("https://example.test/report.html"))
    );
    mockResultsService.getJobSettingParams.and.returnValue(
      of({ runId: mockJob.id, settingParams: { binder_name: "PDL1" } })
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
      { ...mockJob, id: "c", score: 0.9 },
    ]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("desc");
    expect(component.jobs().map((job) => job.id)).toEqual(["c", "a", "b"]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("asc");
    expect(component.jobs().map((job) => job.id)).toEqual(["a", "c", "b"]);

    component.toggleScoreSort();
    expect(component.scoreSortDirection()).toBe("none");
    expect(component.jobs().map((job) => job.id)).toEqual(["a", "c", "b"]);
  });

  it("should return status classes and helpers", () => {
    expect(component.getStatusClass("Completed")).toBe("bg-green-100 text-green-800");
    expect(component.getStatusClass("In progress")).toBe("text-gray-700");
    expect(component.getStatusClass("In queue")).toBe(
      "bg-white text-black border border-black"
    );
    expect(component.getStatusClass("Failed")).toBe("bg-red-600 text-white");
    expect(component.getStatusClass("Stopped")).toBe("bg-yellow-100 text-red-700");
    expect(component.getStatusClass("Unknown")).toBe("bg-gray-100 text-gray-800");
    expect(component.isInProgress("In progress")).toBeTrue();
    expect(component.isCancelable("In progress")).toBeTrue();
    expect(component.isCancelable("In queue")).toBeTrue();
    expect(component.isCancelable("Completed")).toBeFalse();
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

  it("should manage job details dialog visibility and tab state", () => {
    component.viewJobDetails(mockJob);

    expect(component.showJobDetailsDialog()).toBeTrue();
    expect(component.selectedJobDetails()).toEqual(mockJob);

    component.closeJobDetailsDialog();
    expect(component.showJobDetailsDialog()).toBeFalse();
    expect(component.selectedJobDetails()).toBeNull();
  });

  it("should clean up viewport listeners on destroy", () => {
    const cleanupSpy = jasmine.createSpy("cleanup");
    (component as unknown as { viewportListeners: Array<() => void> }).viewportListeners = [
      cleanupSpy,
    ];

    component.ngOnDestroy();

    expect(cleanupSpy).toHaveBeenCalled();
  });

  it("should toggle and close the status dropdown", () => {
    component.toggleStatusDropdown();
    expect(component.showStatusDropdown()).toBeTrue();

    component.toggleStatusDropdown();
    expect(component.showStatusDropdown()).toBeFalse();

    component.showStatusDropdown.set(true);
    component.closeStatusDropdown();
    expect(component.showStatusDropdown()).toBeFalse();
  });

  it("should open the action menu with viewport-aware style", fakeAsync(() => {
    const trigger = {
      getBoundingClientRect: () => ({
        right: 300,
        bottom: 200,
        top: 160,
      }),
    } as HTMLElement;

    component.toggleActionMenu(mockJob.id, trigger);
    fixture.detectChanges();

    const menuComponent = fixture.debugElement.query(By.directive(JobsActionMenuComponent)).componentInstance as JobsActionMenuComponent;
    spyOn(menuComponent.menuContainer.nativeElement, "getBoundingClientRect").and.returnValue(
      { width: 208, height: 140, top: 0, left: 0, right: 208, bottom: 140 } as DOMRect
    );

    tick(0);

    expect(component.isActionMenuOpen(mockJob.id)).toBeTrue();
    expect(component.actionMenuStyle()).toEqual({
      left: "92px",
      top: "208px",
    });
  }));

  it("should position the action menu upwards when there is not enough space below", fakeAsync(() => {
    spyOnProperty(window, "innerHeight", "get").and.returnValue(240);
    const trigger = {
      getBoundingClientRect: () => ({
        right: 280,
        bottom: 220,
        top: 200,
      }),
    } as HTMLElement;

    component.toggleActionMenu(mockJob.id, trigger);
    fixture.detectChanges();

    const menuComponent = fixture.debugElement.query(By.directive(JobsActionMenuComponent)).componentInstance as JobsActionMenuComponent;
    spyOn(menuComponent.menuContainer.nativeElement, "getBoundingClientRect").and.returnValue(
      { width: 208, height: 140, top: 0, left: 0, right: 208, bottom: 140 } as DOMRect
    );

    tick(0);

    expect(component.actionMenuStyle()).toEqual({
      left: "72px",
      top: "52px",
    });
  }));

  it("should clamp the action menu horizontally within the viewport", fakeAsync(() => {
    spyOnProperty(window, "innerWidth", "get").and.returnValue(220);
    const trigger = {
      getBoundingClientRect: () => ({
        right: 500,
        bottom: 150,
        top: 120,
      }),
    } as HTMLElement;

    component.toggleActionMenu(mockJob.id, trigger);
    fixture.detectChanges();

    const menuComponent = fixture.debugElement.query(By.directive(JobsActionMenuComponent)).componentInstance as JobsActionMenuComponent;
    spyOn(menuComponent.menuContainer.nativeElement, "getBoundingClientRect").and.returnValue(
      { width: 208, height: 140, top: 0, left: 0, right: 208, bottom: 140 } as DOMRect
    );

    tick(0);

    expect(component.actionMenuStyle().left).toBe("8px");
  }));

  it("should close the action menu when toggling the same job again", () => {
    component.openActionMenuId.set(mockJob.id);
    component.actionMenuStyle.set({ left: "10px", top: "20px" });

    component.toggleActionMenu(mockJob.id);

    expect(component.openActionMenuId()).toBeNull();
    expect(component.actionMenuStyle()).toEqual({});
  });

  it("should render the action menu component when a row menu is opened", async () => {
    const triggerButton = fixture.debugElement.query(
      By.css('button[aria-label="Job actions"]')
    ).nativeElement as HTMLButtonElement;

    triggerButton.click();
    await detectComponentChanges();

    expect(component.isActionMenuOpen(mockJob.id)).toBeTrue();
    expect(
      fixture.debugElement.query(By.css("app-jobs-action-menu"))
    ).toBeTruthy();
  });

  it("should render the job details dialog when viewing job details", async () => {
    component.viewJobDetails(mockJob);
    await detectComponentChanges();

    expect(
      fixture.debugElement.query(By.directive(JobResultsComponent))
    ).toBeTruthy();
  });

  it("should close the menu when the viewport changes", () => {
    component.openActionMenuId.set(mockJob.id);
    component.actionMenuStyle.set({ left: "10px", top: "20px" });

    component.onViewportChange();

    expect(component.openActionMenuId()).toBeNull();
    expect(component.actionMenuStyle()).toEqual({});
  });

  it("should do nothing on viewport changes when no action menu is open", () => {
    component.onViewportChange();

    expect(component.openActionMenuId()).toBeNull();
    expect(component.actionMenuStyle()).toEqual({});
  });

  it("should open delete confirmation from the job details dialog", () => {
    component.viewJobDetails(mockJob);

    component.deleteSelectedJobFromDetails();

    expect(component.selectedJobs()).toEqual([mockJob.id]);
    expect(component.showDeleteDialog()).toBeTrue();
    expect(component.showJobDetailsDialog()).toBeFalse();
  });

  it("should ignore delete and download requests when no job details are selected", () => {
    component.deleteSelectedJobFromDetails();
    component.downloadSelectedJobFiles();

    expect(component.showDeleteDialog()).toBeFalse();
  });

  it("should download the selected job details package", () => {
    const createObjectUrlSpy = spyOn(URL, "createObjectURL").and.returnValue("blob:test");
    const revokeObjectUrlSpy = spyOn(URL, "revokeObjectURL");
    const link = {
      click: jasmine.createSpy("click"),
      href: "",
      download: ""
    } as unknown as HTMLAnchorElement;
    spyOn(document, "createElement").and.returnValue(link);
    component.viewJobDetails(mockJob);

    component.downloadSelectedJobFiles();

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(link.download).toContain("example-job");
    expect(link.click).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:test");
  });

  it("should provide fallback values for job detail helpers", () => {
    component.viewJobDetails(secondJob);

    expect(component.selectedJobDetails()).toEqual(secondJob);
  });

  it("should clear selection and close the delete dialog when no jobs are selected", () => {
    const closeDeleteDialogSpy = spyOn(component, "closeDeleteDialog").and.callThrough();

    component.confirmDelete();

    expect(mockJobsService.bulkDeleteJobs).not.toHaveBeenCalled();
    expect(closeDeleteDialogSpy).toHaveBeenCalled();
    expect(component.bulkDeleting()).toBeFalse();
  });

  it("should confirm delete and reload jobs", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();
    const closeDeleteDialogSpy = spyOn(component, "closeDeleteDialog").and.callThrough();
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

  it("should cancel a cancellable job and reload jobs", () => {
    const loadJobsSpy = spyOn(component, "loadJobs").and.stub();

    component.cancelJob(mockJob);

    expect(mockJobsService.cancelJob).toHaveBeenCalledWith(mockJob.id);
    expect(component.isActionLoading(mockJob.id)).toBeFalse();
    expect(loadJobsSpy).toHaveBeenCalled();
  });

  it("should not cancel a non-cancellable job", () => {
    component.cancelJob({ ...mockJob, status: "Completed" });

    expect(mockJobsService.cancelJob).not.toHaveBeenCalled();
    expect(component.isActionLoading(mockJob.id)).toBeFalse();
  });

  it("should handle cancel failures", () => {
    mockJobsService.cancelJob.and.returnValue(
      throwError(() => new Error("cancel failed"))
    );

    component.cancelJob(mockJob);

    expect(component.error()).toBe("Failed to cancel job. Please try again.");
    expect(component.isActionLoading(mockJob.id)).toBeFalse();
  });

  it("should close the action menu and set a placeholder error when viewing details", () => {
    component.openActionMenuId.set(mockJob.id);

    component.viewJobDetails(mockJob);

    expect(component.openActionMenuId()).toBeNull();
    expect(component.showJobDetailsDialog()).toBeTrue();
    expect(component.selectedJobDetails()).toEqual(mockJob);
  });
});
