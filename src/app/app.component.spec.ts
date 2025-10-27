import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './cores/auth.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      login: jasmine.createSpy('login'),
      logout: jasmine.createSpy('logout'),
      dismissError: jasmine.createSpy('dismissError'),
      isAuthenticated$: of(false),
      user$: of(null),
      error$: of(null),
      errorMessage$: of(null),
      showErrorBanner$: of(false),
      bannerMessage$: of(null),
      bannerType$: of('error'),
      showBanner$: of(false),
      getAccessTokenSilently: jasmine.createSpy('getAccessTokenSilently').and.returnValue(of(undefined))
    } as unknown as jasmine.SpyObj<AuthService>;

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('SBP Portal');
  });

  it('shows login button when logged out and triggers login', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button?.textContent).toContain('Sign up or log in');
    button?.click();
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('calls AuthService login method when login is triggered', () => {
    component.login();
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('shows logout dialog when logout is triggered', () => {
    component.logout();
    expect(component.showLogoutDialog()).toBe(true);
  });

  it('calls AuthService logout method when logout is confirmed', () => {
    component.onLogoutConfirmed();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('does not call AuthService logout method when logout is cancelled', () => {
    component.onLogoutCancelled();
    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });

    it('calls AuthService dismissError method when dismissError is triggered', () => {
      component.dismissError();
      expect(mockAuthService.dismissError).toHaveBeenCalled();
    });

    // Tests removed - no longer using retry functionality
    // Authentication errors now automatically trigger logout and redirect to home page
    // The component now handles all authentication errors generically

  it('shows logout button when logged in', async () => {
    // Create a new mock with isAuthenticated$ = true
    const mockAuthServiceLoggedIn = {
      ...mockAuthService,
      isAuthenticated$: of(true),
      user$: of({ name: 'Test' })
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AuthService, useValue: mockAuthServiceLoggedIn }]
    }).compileComponents();

    const fixture2 = TestBed.createComponent(AppComponent);
    fixture2.detectChanges();
    const compiled = fixture2.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button?.textContent).toContain('Log out');
  });

  it('displays error alert with exact error message until user logs in', async () => {
    // Create a new mock with error state
    const mockAuthServiceWithError = {
      ...mockAuthService,
      showBanner$: of(true),
      bannerMessage$: of('email_not_verified'),
      bannerType$: of('error')
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AuthService, useValue: mockAuthServiceWithError }]
    }).compileComponents();

    const fixture2 = TestBed.createComponent(AppComponent);
    fixture2.detectChanges();
    const compiled = fixture2.nativeElement as HTMLElement;
    
    // Should show error banner with exact error message (no prefix)
    const errorBanner = compiled.querySelector('.bg-red-50');
    expect(errorBanner).toBeTruthy();
    expect(errorBanner?.textContent).toContain('email_not_verified');
    expect(errorBanner?.textContent).not.toContain('Authentication error:');
  });

  it('hides error banner when showBanner$ is false', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const errorBanner = compiled.querySelector('.bg-red-50');
    expect(errorBanner).toBeFalsy();
  });
});
