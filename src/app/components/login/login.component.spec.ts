import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { BehaviorSubject, of } from "rxjs";
import { AuthService } from "../../cores/auth.service";

import { environment } from "../../../environments/environment";
import { Login } from "./login.component";

describe("Login", () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: Pick<Router, "url">;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let userSubject: BehaviorSubject<{ email?: string } | null>;
  let windowOpenSpy: jasmine.Spy;

  const detectComponentChanges = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    userSubject = new BehaviorSubject<{ email?: string } | null>(null);

    mockAuthService = jasmine.createSpyObj("AuthService", ["login", "logout"], {
      isAuthenticated$: isAuthenticatedSubject.asObservable(),
      user$: userSubject.asObservable(),
      error$: of(null),
    });

    mockRouter = {
      url: "/themes?tab=structure-prediction",
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await detectComponentChanges();

    windowOpenSpy = spyOn(window, "open").and.callFake(() => null);
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should call auth service login with current url when login is triggered", () => {
    component.login();
    expect(mockAuthService.login).toHaveBeenCalledWith(
      "/themes?tab=structure-prediction"
    );
  });

  it("should render the login button when the user is not authenticated", async () => {
    await detectComponentChanges();

    const buttonElement = fixture.debugElement.query(
      By.css('[data-testid="login-button"]')
    );

    expect(buttonElement).toBeTruthy();
    expect(buttonElement?.nativeElement?.textContent?.toLowerCase()).toContain(
      "log in"
    );

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).not.toContain("Profile");
    expect(nativeElement.textContent).not.toContain("Logout");
  });

  it("should call auth service logout when logout is triggered", () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it("should show the authenticated user email and actions", async () => {
    isAuthenticatedSubject.next(true);
    userSubject.next({ email: "tester@example.com" });
    await detectComponentChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const emailDisplay = nativeElement.querySelector(
      ".text-sm.font-bold"
    ) as HTMLElement | null;
    const profileButton = Array.from(
      nativeElement.querySelectorAll("button")
    ).find((button) => button.textContent?.includes("Profile"));
    const logoutButton = Array.from(
      nativeElement.querySelectorAll("button")
    ).find((button) => button.textContent?.includes("Log out"));

    expect(emailDisplay?.textContent).toContain("tester@example.com");
    expect(profileButton).toBeDefined();
    expect(logoutButton).toBeDefined();
    expect(
      nativeElement.querySelector('[data-testid="login-button"]')
    ).toBeNull();
  });

  it("should show the default email placeholder when user information is missing", async () => {
    isAuthenticatedSubject.next(true);
    userSubject.next(null);
    await detectComponentChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const emailDisplay = nativeElement.querySelector(
      ".text-sm.font-bold"
    ) as HTMLElement | null;

    expect(emailDisplay?.textContent).toContain("user@example.com");
  });

  it("should open the external profile page when Profile is selected", () => {
    component.openProfile();

    expect(windowOpenSpy).toHaveBeenCalledWith(environment.profileUrl, "_self");
  });
});
