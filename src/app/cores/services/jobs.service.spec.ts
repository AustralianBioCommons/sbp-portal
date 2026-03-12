import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { environment } from "../../../environments/environment";
import { JobsService } from "./jobs.service";

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
    expect(req.request.params.getAll("status")).toEqual(["Completed", "Failed"]);
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

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/jobs/job%2F1`);
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
