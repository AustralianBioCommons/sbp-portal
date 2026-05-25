import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { AuthClientConfig } from "@auth0/auth0-angular";
import { firstValueFrom, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import {
  environmentDefaults,
  updateEnvironment,
} from "../../../environments/environment";
import {
  RuntimeEnvironmentConfig,
  mergeEnvironmentConfig,
} from "../../../environments/runtime-config";

@Injectable({ providedIn: "root" })
export class RuntimeConfigLoaderService {
  private readonly http = inject(HttpClient);
  private readonly authClientConfig = inject(AuthClientConfig);

  load(): Promise<RuntimeEnvironmentConfig> {
    return firstValueFrom(
      this.http
        .get<RuntimeEnvironmentConfig>("assets/config/app-config.json")
        .pipe(
          catchError((error) => {
            console.error(
              "Failed to load runtime config. Using defaults.",
              error
            );
            return of({} as RuntimeEnvironmentConfig);
          }),
          tap((runtime) => {
            updateEnvironment(runtime);
            const merged = mergeEnvironmentConfig(environmentDefaults, runtime);
            const apiBaseUrl = merged.apiBaseUrl || window.location.origin;

            this.authClientConfig.set({
              domain: merged.auth.domain,
              clientId: merged.auth.clientId,
              authorizationParams: {
                audience: merged.auth.audience,
                redirect_uri: window.location.origin,
              },
              httpInterceptor: {
                allowedList: [`${apiBaseUrl}/api/*`],
              },
            });
          })
        )
    ).catch(() => ({} as RuntimeEnvironmentConfig));
  }
}
