import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { authHttpInterceptorFn, provideAuth0 } from "@auth0/auth0-angular";
import { environment, updateEnvironment } from "../environments/environment";
import { RuntimeEnvironmentConfig } from "../environments/runtime-config";
import { routes } from "./app.routes";

export async function getAppConfig(): Promise<ApplicationConfig> {
  let runtimeConfig: RuntimeEnvironmentConfig = {};
  try {
    const response = await fetch("assets/config/app-config.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    runtimeConfig = await response.json();
  } catch (err) {
    console.warn("Failed to load runtime config, using defaults.", err);
  }

  updateEnvironment(runtimeConfig);
  const apiBaseUrl = environment.apiBaseUrl;

  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(
        routes,
        withInMemoryScrolling({ scrollPositionRestoration: "top" })
      ),
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideAuth0({
        domain: environment.auth.domain,
        clientId: environment.auth.clientId,
        authorizationParams: {
          audience: environment.auth.audience,
          redirect_uri: window.location.origin,
        },
        httpInterceptor: {
          allowedList: [`${apiBaseUrl}/api/*`],
        },
      }),
      provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    ],
  };
}
