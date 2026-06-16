import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { environment } from "../../../environments/environment";
import { JobListItem, JobsService } from "./jobs.service";

describe("JobsService", () => {
  let service: JobsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), JobsService],
    });

    service = TestBed.inject(JobsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should list jobs without query params", () => {
    service.listJobs().subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/jobs`);
    expect(req.request.method).toBe("GET");
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ jobs: [], total: 0, limit: 50, offset: 0 });
  });

  it("should include search, repeated statuses, limit, and offset when listing jobs", () => {
    service
      .listJobs({
        search: "binder",
        status: ["Completed", "Failed"],
        limit: 25,
        offset: 50,
      })
      .subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/api/jobs`
    );
    expect(req.request.method).toBe("GET");
    expect(req.request.params.get("search")).toBe("binder");
    expect(req.request.params.getAll("status")).toEqual([
      "Completed",
      "Failed",
    ]);
    expect(req.request.params.get("limit")).toBe("25");
    expect(req.request.params.get("offset")).toBe("50");
    req.flush({ jobs: [], total: 0, limit: 25, offset: 50 });
  });

  it("should ignore empty status arrays when listing jobs", () => {
    service.listJobs({ status: [] }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/jobs`);
    expect(req.request.params.has("status")).toBeFalse();
    req.flush({ jobs: [], total: 0, limit: 50, offset: 0 });
  });

  it("should resolve a job by run id from the listing and normalize it", () => {
    let result: JobListItem | null | undefined;
    service.getJob("run-2").subscribe((job) => (result = job));

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/api/jobs`
    );
    expect(req.request.params.get("limit")).toBe("1000");
    expect(req.request.params.get("offset")).toBe("0");
    req.flush({
      jobs: [
        {
          id: "run-1",
          jobName: "A",
          workflow: "wf-a",
          tool: "t",
          status: "Completed",
          submittedAt: "2026-01-01",
          score: 1,
        },
        {
          id: "run-2",
          jobName: "B",
          workflow_name: "wf-b",
          tool: "t",
          status: "Completed",
          submittedAt: "2026-01-02",
          score: 2,
          final_design_count: 5,
        },
      ],
      total: 2,
      limit: 1000,
      offset: 0,
    });

    expect(result).toEqual(
      jasmine.objectContaining({
        id: "run-2",
        workflow: "wf-b",
        finalDesignCount: 5,
      })
    );
  });

  it("should return null from getJob when no job matches the run id", () => {
    let result: JobListItem | null | undefined;
    service.getJob("missing").subscribe((job) => (result = job));

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/api/jobs`
    );
    req.flush({ jobs: [], total: 0, limit: 1000, offset: 0 });

    expect(result).toBeNull();
  });

  it("should fall back to defaults when normalizing a job without aliases", () => {
    const normalized = service.normalizeJob({
      id: "run-3",
      jobName: "C",
      workflow: "",
      tool: "t",
      status: "Running",
      submittedAt: "2026-01-03",
      score: null,
    });

    expect(normalized.finalDesignCount).toBeNull();
    expect(normalized.workflow).toBe("");
  });

  it("should cancel a job by encoded id", () => {
    service.cancelJob("job/1").subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/jobs/job%2F1/cancel`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({});
    req.flush({ message: "Cancelled", runId: "job/1", status: "Stopped" });
  });

  it("should delete a job by encoded id", () => {
    service.deleteJob("job/1").subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/jobs/job%2F1`
    );
    expect(req.request.method).toBe("DELETE");
    req.flush({
      runId: "job/1",
      deleted: true,
      cancelledBeforeDelete: false,
      message: "Deleted",
    });
  });

  it("should bulk delete jobs with the provided run ids", () => {
    service.bulkDeleteJobs(["job-1", "job-2"]).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/jobs/bulk-delete`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ runIds: ["job-1", "job-2"] });
    req.flush({ deleted: ["job-1", "job-2"], failed: {} });
  });
});
