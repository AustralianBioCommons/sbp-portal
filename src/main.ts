// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './app/cores/auth.interceptor';
import { authGuard } from './app/cores/auth.guard';
import { provideAuth0 } from '@auth0/auth0-angular';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      { path: '', component: AppComponent },
      { path: 'protected', component: AppComponent, canActivate: [authGuard] },
      // add more routes here
    ]),
    provideAuth0({
      domain: environment.auth.domain,
      clientId: environment.auth.clientId,
      authorizationParams: {
        audience: undefined,
        redirect_uri: window.location.origin
      }
    }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
}).catch((err) => console.error(err));
