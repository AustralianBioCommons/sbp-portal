import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AuthService } from "../../cores/auth.service";
import { of } from "rxjs";

import { Login } from "./login.component";

describe("Login", () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj("AuthService", ["login", "logout"], {
      isAuthenticated$: of(false),
      user$: of(null),
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

  it("should call auth service logout when logout is triggered", () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
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
