// src/main.ts
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { authHttpInterceptorFn, provideAuth0 } from "@auth0/auth0-angular";
import { AppComponent } from "./app/app.component";
import { authGuard } from "./app/cores/services/auth.guard";
import { Home } from "./app/pages/home/home";
import { JobsComponent } from "./app/pages/jobs/jobs";
import { NotFoundComponent } from "./app/pages/not-found/not-found";
import { DeNovoDesignComponent } from "./app/pages/workflow/de-novo-design/de-novo-design";
import { environment } from "./environments/environment";

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter([
      { path: "", redirectTo: "/themes", pathMatch: "full" },
      { path: "themes", component: Home },
      {
        path: "de-novo-design",
        component: DeNovoDesignComponent,
      },
      {
        path: "jobs",
        component: JobsComponent,
      },
      { path: "protected", component: AppComponent, canActivate: [authGuard] },
      // 404 catch-all route - MUST be last
      { path: "**", component: NotFoundComponent },
    ]),
    provideAuth0({
      domain: environment.auth.domain,
      clientId: environment.auth.clientId,
      authorizationParams: {
        audience: environment.auth.audience,
        redirect_uri: window.location.origin,
      },
      // Configure Auth0's built-in interceptor
      httpInterceptor: {
        allowedList: [
          // If apiBaseUrl is configured, use it; otherwise use relative paths pattern
          environment.apiBaseUrl || `${window.location.origin}/api/*`,
        ],
      },
    }),
    // Use Auth0's built-in HTTP interceptor instead of our custom one
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
  ],
}).catch((err) => console.error(err));
