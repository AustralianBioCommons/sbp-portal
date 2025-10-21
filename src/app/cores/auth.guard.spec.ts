import { TestBed } from '@angular/core/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '@auth0/auth0-angular';
import { of, firstValueFrom, Observable } from 'rxjs';
import { runInInjectionContext, Injector } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('authGuard', () => {
  it('allows activation when authenticated', (done) => {
    const mockAuth = { isAuthenticated$: of(true) } as unknown as AuthService;
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: mockAuth }] });

    const injector = TestBed.inject(Injector);
    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = { url: '/protected' } as RouterStateSnapshot;
    const can = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));
    firstValueFrom(can as Observable<boolean>).then((res) => {
      expect(res).toBeTrue();
      done();
    });
  });

  it('redirects to login when not authenticated', (done) => {
    const loginSpy = jasmine.createSpy('loginWithRedirect');
    const mockAuth = { isAuthenticated$: of(false), loginWithRedirect: loginSpy } as unknown as AuthService;
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: mockAuth }] });

    const injector = TestBed.inject(Injector);
    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = { url: '/protected' } as RouterStateSnapshot;
    const can = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));
    firstValueFrom(can as Observable<boolean>).then((res) => {
      expect(res).toBeFalse();
      expect(loginSpy).toHaveBeenCalled();
      done();
    });
  });
});
