// src/main.ts
import { provideZoneChangeDetection } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { authHttpInterceptorFn, provideAuth0 } from "@auth0/auth0-angular";
import { AppComponent } from "./app/app.component";
import { authGuard } from "./app/cores/auth.guard";
import { Home } from "./app/pages/home/home";
import { JobsComponent } from "./app/pages/jobs/jobs";
import { AccessPreviewComponent } from "./app/pages/dev/access-preview";
import { NotFoundComponent } from "./app/pages/not-found/not-found";
import { DeNovoDesignComponent } from "./app/pages/workflow/de-novo-design/de-novo-design";
import { InteractionScreeningComponent } from "./app/pages/workflow/interaction-screening/interaction-screening";
import { SinglePredictionComponent } from "./app/pages/workflow/single-prediction/single-prediction";
import {
  environmentDefaults,
  updateEnvironment,
} from "./environments/environment";
import {
  RuntimeEnvironmentConfig,
  mergeEnvironmentConfig,
} from "./environments/runtime-config";
import { buildVersion } from "./environments/build-version";

console.info("Structural Biology Portal build version:", buildVersion);

async function bootstrap(): Promise<void> {
  let runtimeConfig: RuntimeEnvironmentConfig = {};
  try {
    const response = await fetch("assets/config/app-config.json");
    runtimeConfig = await response.json();
  } catch {
    console.warn("Failed to load runtime config, using defaults.");
  }

  updateEnvironment(runtimeConfig);
  const config = mergeEnvironmentConfig(environmentDefaults, runtimeConfig);
  const apiBaseUrl = config.apiBaseUrl || window.location.origin;

  bootstrapApplication(AppComponent, {
    providers: [
      provideZoneChangeDetection(),
      provideAnimations(),
      provideRouter([
        { path: "", redirectTo: "/themes", pathMatch: "full" },
        { path: "themes", component: Home },
        {
          path: "de-novo-design",
          component: DeNovoDesignComponent,
        },
        {
          path: "interaction-screening",
          component: InteractionScreeningComponent,
        },
        {
          path: "single-structure-prediction",
          component: SinglePredictionComponent,
        },
        {
          path: "jobs",
          component: JobsComponent,
        },
        {
          path: "protected",
          component: AppComponent,
          canActivate: [authGuard],
        },
        { path: "dev/access-preview", component: AccessPreviewComponent },
        // 404 catch-all route - MUST be last
        { path: "**", component: NotFoundComponent },
      ]),
      provideAuth0({
        domain: config.auth.domain,
        clientId: config.auth.clientId,
        authorizationParams: {
          audience: config.auth.audience,
          redirect_uri: window.location.origin,
        },
        httpInterceptor: {
          allowedList: [`${apiBaseUrl}/api/*`],
        },
      }),
      provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    ],
  }).catch((err) => console.error(err));
}

bootstrap();
