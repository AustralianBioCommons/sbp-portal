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

  it("starts with a null shared balance", () => {
    const service = setup();
    expect(service.balance()).toBeNull();
  });

  it("getMyCredit GETs the user credit endpoint, returns the body, and updates the shared balance", () => {
    const service = setup();
    let result: UserCreditResponse | undefined;
    service.getMyCredit().subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/users/me/credit`
    );
    expect(req.request.method).toBe("GET");
    req.flush({ userId: "u1", credit: 42 });

    expect(result).toEqual({ userId: "u1", credit: 42 });
    expect(service.balance()).toBe(42);
  });

  it("refreshBalance re-fetches and updates the shared balance", () => {
    const service = setup();
    service.refreshBalance();

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/users/me/credit`)
      .flush({ userId: "u1", credit: 75 });

    expect(service.balance()).toBe(75);
  });

  it("refreshBalance swallows errors and leaves the balance unchanged", () => {
    const service = setup();
    service.refreshBalance();

    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/users/me/credit`)
      .error(new ProgressEvent("error"));

    expect(service.balance()).toBeNull();
  });

  it("clearBalance resets the shared balance", () => {
    const service = setup();
    service.getMyCredit().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/api/users/me/credit`)
      .flush({ userId: "u1", credit: 10 });
    expect(service.balance()).toBe(10);

    service.clearBalance();
    expect(service.balance()).toBeNull();
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

  it("propagates request errors to the caller", () => {
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
