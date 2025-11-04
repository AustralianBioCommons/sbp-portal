import { TestBed } from "@angular/core/testing";
import { AuthService } from "./auth.service";
import { AuthService as Auth0Service } from "@auth0/auth0-angular";
import { of, BehaviorSubject } from "rxjs";

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

  beforeEach(() => {
    errorSubject = new BehaviorSubject<TestAuthError | null>(null);
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    mockAuth0Service = jasmine.createSpyObj(
      "AuthService",
      ["loginWithRedirect", "logout", "getAccessTokenSilently"],
      {
        isAuthenticated$: isAuthenticatedSubject.asObservable(),
        user$: of(null),
        error$: errorSubject.asObservable(),
        isLoading$: of(false),
      }
    );

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth0Service, useValue: mockAuth0Service },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should call Auth0 loginWithRedirect when login is called", () => {
    service.login();
    expect(mockAuth0Service.loginWithRedirect).toHaveBeenCalled();
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

      // Track banner visibility
      let bannerShown = false;
      service.showBanner$.subscribe((visible) => {
        if (visible && !bannerShown) {
          bannerShown = true;
          expect(service.currentBannerMessage).toBe("email_not_verified");
          expect(service.currentBannerType).toBe("error");

          // Check that logout will be called after 3 seconds
          setTimeout(() => {
            expect(mockAuth0Service.logout).toHaveBeenCalled();
            done();
          }, 3100); // Slightly more than 3 seconds to ensure timeout completes
        }
      });

      // Trigger authentication error
      errorSubject.next(error);
    });

    // retry login functionality removed - authentication errors now show for 3 seconds then trigger automatic logout
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
  });
});
