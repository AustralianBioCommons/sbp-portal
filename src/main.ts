// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authGuard } from './app/cores/auth.guard';
import { provideAuth0, authHttpInterceptorFn } from '@auth0/auth0-angular';
import { environment } from './environments/environment';
import { Home } from './app/pages/home/home';
import { NotFoundComponent } from './app/pages/not-found/not-found';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter([
      { path: '', redirectTo: '/themes', pathMatch: 'full' },
  { path: 'themes', component: Home },
      { path: 'single-structure-prediction', redirectTo: '/themes?tab=structure-prediction' },
      { path: 'interaction-screening', redirectTo: '/themes?tab=interaction-screening' },
      { path: 'protected', component: AppComponent, canActivate: [authGuard] },
      // 404 catch-all route - MUST be last
      { path: '**', component: NotFoundComponent }
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
