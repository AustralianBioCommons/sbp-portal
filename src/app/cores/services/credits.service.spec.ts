import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import {
  CreditsService,
  TOTAL_CREDITS,
  UserCreditResponse,
  WorkflowCreditsResponse,
} from "./credits.service";
import { environment } from "../../../environments/environment";

describe("CreditsService", () => {
  let httpMock: HttpTestingController;
  const originalApiBaseUrl = environment.apiBaseUrl;
  const originalProduction = environment.production;

  /** Build the service after any per-test environment tweaks. */
  function setup(): CreditsService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(CreditsService);
  }

  afterEach(() => {
    httpMock.verify();
    environment.apiBaseUrl = originalApiBaseUrl;
    environment.production = originalProduction;
  });

  it("should be created", () => {
    expect(setup()).toBeTruthy();
  });

  it("exposes a fixed total credit allowance", () => {
    setup();
    expect(TOTAL_CREDITS).toBe(1000);
  });

  it("getMyCredit GETs the user credit endpoint and returns the body", () => {
    const service = setup();
    let result: UserCreditResponse | undefined;
    service.getMyCredit().subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/users/me/credit`
    );
    expect(req.request.method).toBe("GET");
    req.flush({ userId: "u1", credit: 42 });

    expect(result).toEqual({ userId: "u1", credit: 42 });
  });

  it("getWorkflowCredits GETs the workflow credits endpoint and returns the body", () => {
    const service = setup();
    let result: WorkflowCreditsResponse | undefined;
    service.getWorkflowCredits().subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/credits`
    );
    expect(req.request.method).toBe("GET");
    req.flush({ workflows: [] });

    expect(result).toEqual({ workflows: [] });
  });

  it("falls back to dummy user credit on error in non-production builds", () => {
    environment.production = false;
    const service = setup();
    let result: UserCreditResponse | undefined;
    service.getMyCredit().subscribe((r) => (result = r));

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/users/me/credit`)
      .error(new ProgressEvent("error"));

    expect(result?.credit).toBe(250);
  });

  it("falls back to dummy workflow credits on error in non-production builds", () => {
    environment.production = false;
    const service = setup();
    let result: WorkflowCreditsResponse | undefined;
    service.getWorkflowCredits().subscribe((r) => (result = r));

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/workflows/credits`)
      .error(new ProgressEvent("error"));

    expect(result?.workflows.length).toBeGreaterThan(0);
    expect(
      result?.workflows.find((w) => w.category === "de-novo-design")
        ?.toolMultipliers
    ).toEqual({ bindcraft: 20, rfdiffusion: 10 });
  });

  it("propagates the error in production builds", () => {
    environment.production = true;
    const service = setup();
    let errored = false;
    service.getMyCredit().subscribe({
      next: () => {},
      error: () => (errored = true),
    });

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/users/me/credit`)
      .error(new ProgressEvent("error"));

    expect(errored).toBeTrue();
  });

  it("uses window.location.origin when apiBaseUrl is not configured", () => {
    environment.apiBaseUrl = "";
    const service = setup();
    service.getMyCredit().subscribe();

    httpMock
      .expectOne(`${window.location.origin}/api/users/me/credit`)
      .flush({ userId: "u", credit: 1 });
  });
});
