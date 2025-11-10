import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AuthService } from "../../cores/auth.service";
import { BehaviorSubject, of } from "rxjs";
import { By } from "@angular/platform-browser";

import { Login } from "./login.component";
import { environment } from "../../../environments/environment";

describe("Login", () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
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

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await detectComponentChanges();

    windowOpenSpy = spyOn(window, "open").and.callFake(() => null);
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should call auth service login when login is triggered", () => {
    component.login();
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it("should render the login button when the user is not authenticated", async () => {
    await detectComponentChanges();

    const buttonElement = fixture.debugElement.query(By.css("app-button"));

    expect(buttonElement).toBeTruthy();
    expect(buttonElement?.nativeElement?.textContent?.toLowerCase()).toContain(
      "log in",
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
    ).find((button) => button.textContent?.includes("Logout"));

    expect(emailDisplay?.textContent).toContain("tester@example.com");
    expect(profileButton).toBeDefined();
    expect(logoutButton).toBeDefined();
    expect(nativeElement.querySelector("app-button")).toBeNull();
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
