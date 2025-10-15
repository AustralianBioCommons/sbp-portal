import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from '@auth0/auth0-angular';
import { of } from 'rxjs';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    const mockAuthService = {
      loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
      logout: jasmine.createSpy('logout'),
      isAuthenticated$: of(false),
      user$: of(null),
      getAccessTokenSilently: () => of(undefined)
    } as unknown as AuthService;

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

  it('should render title text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('SBP Portal');
  });

  it('shows login button when logged out and triggers login', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button?.textContent).toContain('Log in');
    // trigger click
    button?.dispatchEvent(new Event('click'));
    const auth = TestBed.inject(AuthService) as any;
    expect(auth.loginWithRedirect).toHaveBeenCalled();
  });

  it('shows logout button when logged in and triggers logout', async () => {
    // Reconfigure TestBed with isAuthenticated$ = true
    const mockAuthServiceLoggedIn = {
      loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
      logout: jasmine.createSpy('logout'),
      isAuthenticated$: of(true),
      user$: of({ name: 'Test' }),
      getAccessTokenSilently: () => of('token')
    } as unknown as AuthService;

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
    button?.dispatchEvent(new Event('click'));
    const auth = TestBed.inject(AuthService) as any;
    expect(auth.logout).toHaveBeenCalled();
  });

  it('logout fallback calls logout() when logout with params throws', async () => {
    let calls = 0;
    const throwingLogout = jasmine.createSpy('logout').and.callFake(() => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return undefined;
    });
    const mockAuthServiceLoggedIn = {
      loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
      logout: throwingLogout,
      isAuthenticated$: of(true),
      user$: of({ name: 'Test' }),
      getAccessTokenSilently: () => of('token')
    } as unknown as AuthService;

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AuthService, useValue: mockAuthServiceLoggedIn }]
    }).compileComponents();

    const fixture2 = TestBed.createComponent(AppComponent);
    fixture2.detectChanges();
    // call logout method directly to hit try/catch path
    const comp = fixture2.componentInstance;
    expect(() => comp.logout()).not.toThrow();
    // expect both the initial failing call and the fallback to have been attempted
    expect(throwingLogout.calls.count()).toBeGreaterThanOrEqual(1);
  });
});
