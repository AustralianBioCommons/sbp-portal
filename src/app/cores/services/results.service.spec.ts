import { SecurityContext } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { environment } from "../../../environments/environment";
import { ResultsService } from "./results.service";

describe("ResultsService", () => {
  let service: ResultsService;
  let httpMock: HttpTestingController;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ResultsService,
      ],
    });

    service = TestBed.inject(ResultsService);
    httpMock = TestBed.inject(HttpTestingController);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should build the encoded report URL", () => {
    expect(service.getJobReportUrl("job/1")).toBe(
      `${environment.apiBaseUrl}/api/results/job%2F1/report`
    );
  });

  it("should fetch setting params", () => {
    service.getJobSettingParams("job/1").subscribe((response) => {
      expect(response.settingParams).toEqual({ binder_name: "PDL1" });
    });

    const request = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/settingParams`
    );
    expect(request.request.method).toBe("GET");
    request.flush({
      runId: "job/1",
      settingParams: { binder_name: "PDL1" },
    });
  });

  it("should fetch logs", () => {
    service.getJobLogs("job/1").subscribe((response) => {
      expect(response.formattedEntries?.length).toBe(1);
      expect(response.formattedEntries?.[0].message).toBe("line 1");
    });

    const request = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/logs`
    );
    expect(request.request.method).toBe("GET");
    request.flush({
      runId: "job/1",
      entries: ["line 1", "line 2"],
      formattedEntries: [
        {
          index: 0,
          raw: "line 1",
          message: "line 1",
          level: "INFO",
        },
      ],
      logs: "line 1\nline 2",
      lastUpdated: "2026-03-17T00:00:00Z",
    });
  });

  it("should return a trusted resource URL for the report", () => {
    const trustedUrl = service.getSafeReportResourceUrl(
      "https://example.test/report.html"
    );

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "https://example.test/report.html"
    );
  });

  it("should return a trusted resource URL from the report endpoint URL", () => {
    service.getJobReportResourceUrl("job/1").subscribe((response) => {
      expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, response)).toBe(
        `${environment.apiBaseUrl}/api/results/job%2F1/report?token=test-token`
      );
    });

    const previewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/report/preview`
    );
    expect(previewReq.request.method).toBe("POST");
    previewReq.flush({
      runId: "job/1",
      url: "/api/results/job%2F1/report?token=test-token",
    });
  });

  it("should preserve absolute preview report URL", () => {
    service.getJobReportResourceUrl("job/1").subscribe((response) => {
      expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, response)).toBe(
        "https://reports.example.test/job-1/report.html"
      );
    });

    const previewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/report/preview`
    );
    expect(previewReq.request.method).toBe("POST");
    previewReq.flush({
      runId: "job/1",
      url: "https://reports.example.test/job-1/report.html",
    });
  });

  it("should fetch downloads", () => {
    service.getJobDownloads("job/1").subscribe((response) => {
      expect(response.downloads.length).toBe(1);
      expect(response.downloads[0].label).toBe("Results CSV");
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/downloads`
    );
    expect(req.request.method).toBe("GET");
    req.flush({
      runId: "job/1",
      downloads: [
        {
          label: "Results CSV",
          key: "results_csv",
          url: "/files/results.csv",
          category: "stat_csv"
        }
      ]
    });
  });

  it("should return null from getJobReport when report is absent", () => {
    let result: unknown;
    service.getJobReport("job/1").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/report`
    );
    expect(req.request.method).toBe("GET");
    req.flush({ runId: "job/1", report: null });

    expect(result).toBeNull();
  });

  it("should return a safe URL from getJobReport for a relative URL", () => {
    let result: unknown;
    service.getJobReport("job/1").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/report`
    );
    req.flush({
      runId: "job/1",
      report: {
        label: "Report",
        key: "report",
        url: "/api/results/job%2F1/report?token=t",
        category: "report"
      }
    });

    expect(
      sanitizer.sanitize(SecurityContext.RESOURCE_URL, result as never)
    ).toBe(`${environment.apiBaseUrl}/api/results/job%2F1/report?token=t`);
  });

  it("should return a safe URL from getJobReport for an absolute URL", () => {
    let result: unknown;
    service.getJobReport("job/1").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/report`
    );
    req.flush({
      runId: "job/1",
      report: {
        label: "Report",
        key: "report",
        url: "https://cdn.example.test/report.html",
        category: "report"
      }
    });

    expect(
      sanitizer.sanitize(SecurityContext.RESOURCE_URL, result as never)
    ).toBe("https://cdn.example.test/report.html");
  });
});
