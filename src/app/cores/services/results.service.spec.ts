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
  let apiBase: string;

  beforeEach(() => {
    apiBase = environment.apiBaseUrl!.replace(/\/?$/, "/");

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

  it("should build the encoded download-all URL", () => {
    expect(service.getDownloadAllUrl("job/1")).toBe(
      `${environment.apiBaseUrl}/api/results/job%2F1/download-all`
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
      "/api/results/job-1/report"
    );

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      new URL("/api/results/job-1/report", apiBase).href
    );
  });

  it("should sanitize blank report URLs to about:blank", () => {
    const trustedUrl = service.getSafeReportResourceUrl("   ");

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "about:blank"
    );
  });

  it("should allow dot-relative preview report URLs", () => {
    const trustedUrl = service.getSafeReportResourceUrl("./report.html");

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      new URL("./report.html", apiBase).href
    );
  });

  it("should sanitize parent-relative preview report URLs to about:blank", () => {
    const trustedUrl = service.getSafeReportResourceUrl("../report.html");

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "about:blank"
    );
  });

  it("should sanitize embedded parent traversal segments to about:blank", () => {
    const trustedUrl = service.getSafeReportResourceUrl(
      "/reports/../private/report.html"
    );

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "about:blank"
    );
  });

  it("should allow query-only preview report URLs", () => {
    const trustedUrl = service.getSafeReportResourceUrl("?token=test-token");

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      new URL("?token=test-token", apiBase).href
    );
  });

  it("should normalize safe relative report paths with duplicate separators", () => {
    const trustedUrl = service.getSafeReportResourceUrl(
      "/reports//latest/./index.html?token=test-token#summary"
    );

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      `${
        new URL("/reports/latest/index.html", apiBase).href
      }?token=test-token#summary`
    );
  });

  it("should sanitize protocol-relative report URLs to about:blank", () => {
    const trustedUrl = service.getSafeReportResourceUrl(
      "//evil.example/report"
    );

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "about:blank"
    );
  });

  it("should sanitize non-relative report URLs without an explicit scheme", () => {
    const trustedUrl = service.getSafeReportResourceUrl(
      "reports.example.test/job-1/report.html"
    );

    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "about:blank"
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

  it("should allow cross-origin https preview report URLs", () => {
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

  it("should sanitize cross-origin http report URLs to about:blank", () => {
    service.getJobReportResourceUrl("job/1").subscribe((response) => {
      expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, response)).toBe(
        "about:blank"
      );
    });

    const previewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/results/job%2F1/report/preview`
    );
    expect(previewReq.request.method).toBe("POST");
    previewReq.flush({
      runId: "job/1",
      url: "http://reports.example.test/job-1/report.html",
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
          category: "stat_csv",
        },
      ],
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
        category: "report",
      },
    });

    expect(
      sanitizer.sanitize(SecurityContext.RESOURCE_URL, result as never)
    ).toBe(`${environment.apiBaseUrl}/api/results/job%2F1/report?token=t`);
  });

  it("should allow cross-origin https report URLs from getJobReport", () => {
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
        category: "report",
      },
    });

    expect(
      sanitizer.sanitize(SecurityContext.RESOURCE_URL, result as never)
    ).toBe("https://cdn.example.test/report.html");
  });

  it("should sanitize report URLs with non-http/https protocol", () => {
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
        url: "javascript:alert(1)",
        category: "report",
      },
    });

    expect(
      sanitizer.sanitize(SecurityContext.RESOURCE_URL, result as never)
    ).toBe("about:blank");
  });

  it("should sanitize malformed report URLs that cannot be parsed", () => {
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
        url: "http::///bad",
        category: "report",
      },
    });

    expect(
      sanitizer.sanitize(SecurityContext.RESOURCE_URL, result as never)
    ).toBe("about:blank");
  });

  it("should return about:blank for relative URLs when apiBaseUrl is not configured", () => {
    const original = environment.apiBaseUrl;
    (environment as unknown as Record<string, unknown>)["apiBaseUrl"] = "";

    const trustedUrl = service.getSafeReportResourceUrl("/report.html");
    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, trustedUrl)).toBe(
      "about:blank"
    );

    (environment as unknown as Record<string, unknown>)["apiBaseUrl"] =
      original;
  });
});
