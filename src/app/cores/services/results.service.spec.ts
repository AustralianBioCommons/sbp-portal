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
});
