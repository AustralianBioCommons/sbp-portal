import { ComponentFixture, TestBed } from "@angular/core/testing";
import { LoginRedirectComponent } from "./login-redirect.component";
import { AuthService } from "../../cores/auth.service";

class MockAuthService {
  login = jasmine.createSpy("login");
}

describe("LoginRedirectComponent", () => {
  let component: LoginRedirectComponent;
  let fixture: ComponentFixture<LoginRedirectComponent>;
  let auth: MockAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginRedirectComponent],
      providers: [{ provide: AuthService, useClass: MockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginRedirectComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService) as unknown as MockAuthService;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should trigger login on init", () => {
    expect(auth.login).toHaveBeenCalled();
  });
});
