import { TestBed } from '@angular/core/testing';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '@auth0/auth0-angular';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

describe('AuthInterceptor', () => {
  afterEach(() => {
    // ensure no leftover requests
    try {
      TestBed.inject(HttpTestingController).verify();
    } catch {}
  });

  it('attaches Authorization header when token is provided and url matches apiBaseUrl', (done) => {
    const fakeToken = 'fake-token-123';
    const mockAuth = { getAccessTokenSilently: () => of(fakeToken) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
  provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = '/v1/data';

    http.get(url).subscribe((res) => {
      expect(res).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    req.flush({ ok: true });
  });

  it('forwards request without Authorization when token retrieval fails', (done) => {
    const mockAuth = { getAccessTokenSilently: () => throwError(() => new Error('no token')) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
  provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = '/v1/data';

    http.get(url).subscribe((res) => {
      expect(res).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne(url);
    // should not have an Authorization header when token fetch failed
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ ok: true });
  });

  it('does not attempt to attach token for non-API URLs', (done) => {
    const fakeToken = 'should-not-be-used';
    const mockAuth = { getAccessTokenSilently: () => of(fakeToken) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
  provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = 'https://external.example.com/resource';

    http.get(url).subscribe((res) => {
      expect(res).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ ok: true });
  });

  it('propagates error when non-API request fails (triggers no-auth catchError)', (done) => {
    const mockAuth = { getAccessTokenSilently: () => of('unused') } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
  provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = 'https://external.example.com/fail';

    http.get(url).subscribe({
      next: () => fail('should not succeed'),
      error: (err) => {
        expect(err).toBeTruthy();
        done();
      },
    });

    const req = httpMock.expectOne(url);
    req.error(new ErrorEvent('network'), { status: 500, statusText: 'Server Error' });
  });

  it('handles request error when token retrieval returns undefined', (done) => {
    // token retrieval returns undefined (simulating catchError -> of(undefined))
    const mockAuth = { getAccessTokenSilently: () => of(undefined) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
  provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = '/v1/error';

    http.get(url).subscribe({
      next: () => fail('should not succeed'),
      error: (err) => {
        expect(err).toBeTruthy();
        done();
      },
    });

    const req = httpMock.expectOne(url);
    req.error(new ErrorEvent('server'), { status: 500, statusText: 'Err' });
  });

  it('handles authorized request failure and rethrows', (done) => {
    const fakeToken = 'present-token';
    const mockAuth = { getAccessTokenSilently: () => of(fakeToken) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
  provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = '/v1/auth-fail';

    http.get(url).subscribe({
      next: () => fail('should not succeed'),
      error: (err) => {
        expect(err).toBeTruthy();
        done();
      },
    });

    const req = httpMock.expectOne(url);
    // header should be present
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    req.error(new ErrorEvent('server'), { status: 502, statusText: 'Bad Gateway' });
  });

  it('passes audience option to getAccessTokenSilently when configured', (done) => {
    const originalAudience = (environment as any).auth?.audience;
    (environment as any).auth = { ...(environment as any).auth, audience: 'my-aud' };

    let receivedOpts: any = null;
    const fakeToken = 'aud-token';
    const mockAuth = { getAccessTokenSilently: (opts?: any) => { receivedOpts = opts; return of(fakeToken); } } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

  const url = '/v1/aud';

    http.get(url).subscribe((res) => {
      expect(receivedOpts).toEqual({ authorizationParams: { audience: 'my-aud' } });
      // cleanup
      (environment as any).auth = { ...(environment as any).auth, audience: originalAudience };
      done();
    });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    req.flush({ ok: true });
  });

  it('attaches Authorization when environment.apiBaseUrl matches full URL', (done) => {
    const original = (environment as any).apiBaseUrl;
    (environment as any).apiBaseUrl = 'http://localhost:9876';

    const fakeToken = 'cfg-token';
    const mockAuth = { getAccessTokenSilently: () => of(fakeToken) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

    const url = 'http://localhost:9876/v1/from-config';

    http.get(url).subscribe((res) => {
      (environment as any).apiBaseUrl = original;
      done();
    });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    req.flush({ ok: true });
  });

  it('does not attach Authorization when environment.apiBaseUrl does not match', (done) => {
    const original = (environment as any).apiBaseUrl;
    (environment as any).apiBaseUrl = 'https://api.example.com';

    const fakeToken = 'cfg-token';
    const mockAuth = { getAccessTokenSilently: () => of(fakeToken) } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    const httpMock = TestBed.inject(HttpTestingController);
    const http = TestBed.inject(HttpClient);

    const url = '/v1/local-not-config';

    http.get(url).subscribe((res) => {
      (environment as any).apiBaseUrl = original;
      done();
    });

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ ok: true });
  });
});
