// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authGuard } from './app/cores/auth.guard';
import { provideAuth0, authHttpInterceptorFn } from '@auth0/auth0-angular';
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
        audience: environment.auth.audience,
        redirect_uri: window.location.origin
      },
      // Configure Auth0's built-in interceptor
      httpInterceptor: {
        allowedList: [
          // If apiBaseUrl is configured, use it; otherwise use relative paths pattern
          environment.apiBaseUrl || `${window.location.origin}/api/*`,
        ]
      }
    }),
    // Use Auth0's built-in HTTP interceptor instead of our custom one
    provideHttpClient(withInterceptors([authHttpInterceptorFn]))
  ],
}).catch((err) => console.error(err));
