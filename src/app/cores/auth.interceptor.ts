import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Attach Authorization only for requests that target our API
    const configuredApiBase = (environment as any).apiBaseUrl as string | undefined;
    const shouldAttach = configuredApiBase
      ? req.url.startsWith(configuredApiBase)
      : req.url.startsWith('/');

    if (!shouldAttach) {
      return next.handle(req).pipe(
        catchError((err) => {
          console.error('AuthInterceptor: request failed (no auth attached)', err);
          return throwError(() => err);
        })
      );
    }

    // Provide audience if configured
    const audience = (environment as any).auth?.audience;
    const tokenOptions = audience ? { authorizationParams: { audience } } : undefined;

    return this.auth.getAccessTokenSilently(tokenOptions).pipe(
      catchError((err) => {
        console.error('AuthInterceptor: failed to get access token silently', err);
        return of(undefined);
      }),
      switchMap((token) => {
        if (!token) {
          return next.handle(req).pipe(
            catchError((err) => {
              console.error('AuthInterceptor: request failed', err);
              return throwError(() => err);
            })
          );
        }
        const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next.handle(authReq).pipe(
          catchError((err) => {
            console.error('AuthInterceptor: authorized request failed', err);
            return throwError(() => err);
          })
        );
      })
    );
  }
}
