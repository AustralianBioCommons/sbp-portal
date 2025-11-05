import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AuthService } from "../../cores/auth.service";
import { BehaviorSubject, of } from "rxjs";

import { Login } from "./login.component";

describe("Login", () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;
  let userSubject: BehaviorSubject<{ email?: string } | null>;

  beforeEach(async () => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    userSubject = new BehaviorSubject<{ email?: string } | null>(null);

    mockAuthService = jasmine.createSpyObj("AuthService", ["login", "logout"], {
      isAuthenticated$: isAuthenticatedSubject.asObservable(),
      user$: userSubject.asObservable(),
      error$: of(null),
    });

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should call auth service login when login is triggered", () => {
    component.login();
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it("should render the login button when the user is not authenticated", () => {
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector("app-button")).not.toBeNull();
    expect(nativeElement.textContent).toContain("Sign up or log in");
    expect(nativeElement.textContent).not.toContain("Profile");
    expect(nativeElement.textContent).not.toContain("Logout");
  });

  it("should call auth service logout when logout is triggered", () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it("should show the authenticated user email and actions", () => {
    isAuthenticatedSubject.next(true);
    userSubject.next({ email: "tester@example.com" });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const emailDisplay = nativeElement.querySelector(
      ".text-sm.font-bold"
    ) as HTMLElement | null;
    const profileButton = Array.from(
      nativeElement.querySelectorAll("button")
    ).find((button) => button.textContent?.includes("Profile"));
    const logoutButton = Array.from(
      nativeElement.querySelectorAll("button")
    ).find((button) => button.textContent?.includes("Logout"));

    expect(emailDisplay?.textContent).toContain("tester@example.com");
    expect(profileButton).toBeDefined();
    expect(logoutButton).toBeDefined();
    expect(nativeElement.querySelector("app-button")).toBeNull();
  });

  it("should show the default email placeholder when user information is missing", () => {
    isAuthenticatedSubject.next(true);
    userSubject.next(null);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const emailDisplay = nativeElement.querySelector(
      ".text-sm.font-bold"
    ) as HTMLElement | null;

    expect(emailDisplay?.textContent).toContain("user@example.com");
  });

  it("should open the external profile page when Profile is selected", () => {
    const windowOpenSpy = spyOn(window, "open");

    component.openProfile();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://dev.portal.aai.test.biocommons.org.au/profile",
      "_self",
    );
  });
});
