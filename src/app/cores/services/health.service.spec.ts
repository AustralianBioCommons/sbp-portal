import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentsHealthResponse, HealthService } from "./health.service";
import { environment } from "../../../environments/environment";

describe("HealthService", () => {
  let httpMock: HttpTestingController;

  function setup(): HealthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(HealthService);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(setup()).toBeTruthy();
  });

  it("getComponentsHealth GETs the health endpoint and returns the body", () => {
    const service = setup();
    let result: ComponentsHealthResponse | undefined;
    service.getComponentsHealth().subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/health/components`
    );
    expect(req.request.method).toBe("GET");

    const body: ComponentsHealthResponse = {
      overallStatus: "degraded",
      checkedAt: "2026-06-25T03:12:55Z",
      message: "Some workflow services are currently unavailable.",
    };
    req.flush(body);

    expect(result).toEqual(body);
  });

  it("propagates request errors to the caller", () => {
    const service = setup();
    let errored = false;
    service.getComponentsHealth().subscribe({
      next: () => {},
      error: () => (errored = true),
    });

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/health/components`)
      .error(new ProgressEvent("error"));

    expect(errored).toBeTrue();
  });
});
