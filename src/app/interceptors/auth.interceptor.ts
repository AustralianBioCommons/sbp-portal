import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
	private auth = inject(AuthService);

	intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		return this.auth.getAccessTokenSilently().pipe(
			switchMap((token) => {
				if (!token) return next.handle(req);
				const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
				return next.handle(authReq);
			})
		);
	}
}

