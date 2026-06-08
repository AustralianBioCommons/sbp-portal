import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { authHttpInterceptorFn, provideAuth0 } from "@auth0/auth0-angular";
import {
  environmentDefaults,
  updateEnvironment,
} from "../environments/environment";
import {
  RuntimeEnvironmentConfig,
  mergeEnvironmentConfig,
} from "../environments/runtime-config";
import { routes } from "./app.routes";

export async function getAppConfig(): Promise<ApplicationConfig> {
  let runtimeConfig: RuntimeEnvironmentConfig = {};
  try {
    const response = await fetch("assets/config/app-config.json");
    runtimeConfig = await response.json();
  } catch (err) {
    console.warn("Failed to load runtime config, using defaults.", err);
  }

  updateEnvironment(runtimeConfig);
  const config = mergeEnvironmentConfig(environmentDefaults, runtimeConfig);
  const apiBaseUrl = config.apiBaseUrl;

  return {
    providers: [
      provideRouter(routes),
      provideZoneChangeDetection({ eventCoalescing: true }),
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
  };
}
