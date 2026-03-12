import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { AuthService as Auth0Service } from "@auth0/auth0-angular";
import { BehaviorSubject, of } from "rxjs";
import { AuthService } from "./auth.service";
import { environment } from "../../environments/environment";

interface TestAuthError {
  error?: string;
  message?: string;
  error_description?: string;
  [key: string]: unknown;
}

describe("AuthService", () => {
  let service: AuthService;
  let mockAuth0Service: jasmine.SpyObj<Auth0Service>;
  let errorSubject: BehaviorSubject<TestAuthError | null>;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let isLoadingSubject: BehaviorSubject<boolean>;
  let appStateSubject: BehaviorSubject<{ target?: string } | null>;
  let mockRouter: jasmine.SpyObj<Router>;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    errorSubject = new BehaviorSubject<TestAuthError | null>(null);
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    isLoadingSubject = new BehaviorSubject<boolean>(true);
    appStateSubject = new BehaviorSubject<{ target?: string } | null>(null);
    mockRouter = jasmine.createSpyObj("Router", ["navigateByUrl"]);

    mockAuth0Service = jasmine.createSpyObj(
      "AuthService",
      ["loginWithRedirect", "logout", "getAccessTokenSilently"],
      {
        isAuthenticated$: isAuthenticatedSubject.asObservable(),
        user$: of(null),
        error$: errorSubject.asObservable(),
        isLoading$: isLoadingSubject.asObservable(),
        appState$: appStateSubject.asObservable(),
      }
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Auth0Service, useValue: mockAuth0Service },
        { provide: Router, useValue: mockRouter },
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should have loading state management methods", () => {
    // Test the loading state getters and setters
    expect(service.isLoading).toBeDefined();
    expect(service.loadingMessage).toBeDefined();

    // Test manual loading state control
    service.setLoadingState(true, "Test loading message");
    expect(service.isLoading).toBe(true);
    expect(service.loadingMessage).toBe("Test loading message");

    service.setLoadingState(false, "Done loading");
    expect(service.isLoading).toBe(false);
    expect(service.loadingMessage).toBe("Done loading");
  });

  it("should call Auth0 loginWithRedirect when login is called", () => {
    service.login();
    expect(mockAuth0Service.loginWithRedirect).toHaveBeenCalledWith(
      jasmine.objectContaining({
        appState: jasmine.objectContaining({ target: jasmine.any(String) }),
      })
    );
  });

  it("should call Auth0 loginWithRedirect with returnUrl when provided", () => {
    const returnUrl = "/dashboard";
    service.login(returnUrl);
    expect(mockAuth0Service.loginWithRedirect).toHaveBeenCalledWith({
      appState: { target: returnUrl },
    });
  });

  it("should call Auth0 logout with correct params when logout is called", () => {
    service.logout();
    expect(mockAuth0Service.logout).toHaveBeenCalledWith({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  });

  it("should expose Auth0 observables", () => {
    expect(service.isAuthenticated$).toBe(mockAuth0Service.isAuthenticated$);
    expect(service.user$).toBe(mockAuth0Service.user$);
    expect(service.error$).toBe(mockAuth0Service.error$);
  });

  it("should delegate getAccessTokenSilently to Auth0", (done) => {
    const token = "test-token";
    mockAuth0Service.getAccessTokenSilently.and.returnValue(of(token));

    service.getAccessTokenSilently().subscribe((result) => {
      expect(result).toBe(token);
      expect(mockAuth0Service.getAccessTokenSilently).toHaveBeenCalled();
      done();
    });
  });

  describe("Unified Banner handling", () => {
    it("should handle login_required error", (done) => {
      const error = { error: "login_required" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("login_required");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle access_denied error", (done) => {
      const error = { error: "access_denied" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("access_denied");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle unauthorized error", (done) => {
      const error = { error: "unauthorized" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("unauthorized");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle network error", (done) => {
      const error = { message: "network timeout" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("network timeout");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle timeout error", (done) => {
      const error = { message: "connection timeout" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("connection timeout");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle generic error with message", (done) => {
      const error = { message: "Custom error message" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("Custom error message");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle error without message", (done) => {
      const error = { someProperty: "value" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe(
            "An unexpected error occurred during authentication."
          );
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle error with fallback to error.message when error property exists", (done) => {
      const error = { error: "custom_error", message: "Custom message" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("Custom message");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle error by error type", (done) => {
      const error = { error: "email_not_verified" };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("email_not_verified");
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should handle error with description", () => {
      const error = {
        error: "access_denied",
        error_description: "email verification required to continue",
      };

      errorSubject.next(error);

      // Should show general error message
      expect(service.currentBannerMessage).toBe("access_denied");
      expect(service.currentBannerType).toBe("error");
    });

    it("should handle error with message content", (done) => {
      const error = {
        message: "User email is not verified and verification is required",
      };

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe(
            "User email is not verified and verification is required"
          );
          // Use setTimeout to allow async operations to complete
          setTimeout(() => {
            expect(service.currentBannerType).toBe("error");
            done();
          }, 0);
        }
      });

      errorSubject.next(error);
    });

    it("should show banner when error occurs", (done) => {
      const error = { error: "login_required" };

      service.showBanner$.subscribe((showBanner) => {
        if (showBanner) {
          expect(showBanner).toBe(true);
          expect(service.currentBannerType).toBe("error");
          done();
        }
      });

      errorSubject.next(error);
    });

    it("should clear banner when null error is received", () => {
      // First set an error
      const error = { error: "login_required" };
      errorSubject.next(error);

      // Then clear it
      errorSubject.next(null);

      // Check that banner is cleared
      expect(service.currentBannerMessage).toBe("");
      expect(service.isBannerVisible).toBe(false);
    });
  });

  describe("State management", () => {
    it("should dismiss banner when dismissError is called", () => {
      // First trigger an error
      const error = { error: "login_required" };
      errorSubject.next(error);

      // Dismiss error
      service.dismissError();
      expect(service.isBannerVisible).toBe(false);
      expect(service.currentBannerMessage).toBe("");
    });

    it("should return current banner message via getter", () => {
      const error = { error: "login_required" };
      errorSubject.next(error);

      // Check getter after error is set
      expect(service.currentBannerMessage).toBe("login_required");
      expect(service.currentBannerType).toBe("error");
    });

    it("should return current banner state via getter", () => {
      const error = { error: "login_required" };
      errorSubject.next(error);

      // Check getter after error is set
      expect(service.isBannerVisible).toBe(true);
      expect(service.currentBannerType).toBe("error");
    });

    it("should initialize with no banner state", () => {
      expect(service.currentBannerMessage).toBe("");
      expect(service.isBannerVisible).toBe(false);
      expect(service.currentBannerType).toBe(null); // Default type
    });

    it("should show success banner when authentication succeeds", (done) => {
      // Simulate successful authentication
      isAuthenticatedSubject.next(true);

      const syncRequest = httpTestingController.expectOne(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      syncRequest.flush({ message: "synced", userId: "user-1" });

      service.bannerMessage$.subscribe((message) => {
        if (message) {
          expect(message).toBe("Login successful!");
          expect(service.currentBannerType).toBe("success");
          done();
        }
      });
    });

    // retryLogin method removed - using automatic logout and redirect instead
  });

  describe("General error handling", () => {
    it("should show error banner and automatically logout after 3 seconds on authentication error", (done) => {
      const error = { error: "email_not_verified" };

      // Reset the spy call count
      (mockAuth0Service.logout as jasmine.Spy).calls.reset();

      // Track banner visibility
      let bannerShown = false;
      service.showBanner$.subscribe((visible) => {
        if (visible && !bannerShown) {
          bannerShown = true;
          expect(service.currentBannerMessage).toBe("email_not_verified");
          expect(service.currentBannerType).toBe("error");

          // Check that logout will be called after 3 seconds
          setTimeout(() => {
            expect(mockAuth0Service.logout).toHaveBeenCalledWith({
              logoutParams: {
                returnTo: window.location.origin,
              },
            });
            done();
          }, 3100); // Slightly more than 3 seconds to ensure timeout completes
        }
      });

      // Trigger authentication error
      errorSubject.next(error);
    });

    // retry login functionality removed - authentication errors now show for 3 seconds then trigger automatic logout
  });

  describe("Authentication callback handling", () => {
    it("should handle appState changes for navigation", () => {
      const targetUrl = "/protected";
      appStateSubject.next({ target: targetUrl });

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(targetUrl);
    });

    it("should fallback to session storage for auth callback navigation", () => {
      const originalUrl = window.location.pathname + window.location.search;
      const targetUrl = "/protected?tab=results";

      sessionStorage.setItem("sbp.returnUrl", targetUrl);
      history.replaceState({}, "", "/callback?code=test-auth-code");
      mockRouter.navigateByUrl.calls.reset();

      service = TestBed.runInInjectionContext(() => new AuthService());

      appStateSubject.next(null);

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(targetUrl);
      expect(sessionStorage.getItem("sbp.returnUrl")).toBeNull();
      history.replaceState({}, "", originalUrl);
    });
  });

  describe("Loading State Management", () => {
    it("should get current loading state", () => {
      service["loadingSubject"].next(true);
      expect(service.isLoading).toBe(true);

      service["loadingSubject"].next(false);
      expect(service.isLoading).toBe(false);
    });

    it("should get current loading message", () => {
      const testMessage = "Test loading message";
      service["loadingMessageSubject"].next(testMessage);
      expect(service.loadingMessage).toBe(testMessage);
    });

    it("should manually set loading state", () => {
      const testMessage = "Custom loading message";
      service.setLoadingState(true, testMessage);

      expect(service.isLoading).toBe(true);
      expect(service.loadingMessage).toBe(testMessage);

      service.setLoadingState(false);
      expect(service.isLoading).toBe(false);
    });

    it("should update loading state when auth0 loading completes", fakeAsync(() => {
      // Initial emission should set custom loading state
      isLoadingSubject.next(true);
      expect(service.isLoading).toBeTrue();

      isLoadingSubject.next(false);

      // Loading should remain true until timeout completes
      expect(service.isLoading).toBeTrue();

      tick(500);
      expect(service.isLoading).toBeFalse();
    }));
  });

  describe("Current user sync", () => {
    it("should sync the current user only once per authenticated session", () => {
      isAuthenticatedSubject.next(true);

      const firstRequest = httpTestingController.expectOne(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      firstRequest.flush({ message: "synced", userId: "user-1" });

      isAuthenticatedSubject.next(true);
      httpTestingController.expectNone(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      expect(service.currentBannerMessage).toBe("Login successful!");
    });

    it("should allow syncing again after logout resets the session state", () => {
      isAuthenticatedSubject.next(true);

      const firstRequest = httpTestingController.expectOne(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      firstRequest.flush({ message: "synced", userId: "user-1" });

      isAuthenticatedSubject.next(false);
      isAuthenticatedSubject.next(true);

      const secondRequest = httpTestingController.expectOne(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      secondRequest.flush({ message: "synced-again", userId: "user-1" });
      expect(service.currentBannerMessage).toBe("Login successful!");
    });

    it("should not mark the current user as synced when backend sync fails", () => {
      const warnSpy = spyOn(console, "warn");

      isAuthenticatedSubject.next(true);

      const failedRequest = httpTestingController.expectOne(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      failedRequest.flush(
        { message: "failed" },
        { status: 500, statusText: "Server Error" }
      );

      expect(warnSpy).toHaveBeenCalled();

      isAuthenticatedSubject.next(true);

      const retryRequest = httpTestingController.expectOne(
        `${environment.apiBaseUrl}/api/workflows/me/sync`
      );
      retryRequest.flush({ message: "synced", userId: "user-1" });
      expect(warnSpy).toHaveBeenCalled();
    });

    it("should fallback to the window origin when apiBaseUrl is not configured", () => {
      const originalApiBaseUrl = environment.apiBaseUrl;
      environment.apiBaseUrl = "";

      isAuthenticatedSubject.next(true);

      const syncRequest = httpTestingController.expectOne(
        `${window.location.origin}/api/workflows/me/sync`
      );
      syncRequest.flush({ message: "synced", userId: "user-1" });

      expect(service.currentBannerMessage).toBe("Login successful!");

      environment.apiBaseUrl = originalApiBaseUrl;
    });
  });
});
