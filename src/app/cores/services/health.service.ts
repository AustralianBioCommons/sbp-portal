import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Coarse, user-facing health summary returned by GET /api/health/components.
 *
 * The backend deliberately collapses all monitored components into a single
 * signal: it does not surface *which* component is affected, only whether some
 * dependency is degraded, plus a generic user-facing message (null when healthy).
 */
export interface ComponentsHealthResponse {
  overallStatus: HealthStatus;
  checkedAt: string;
  message: string | null;
}

/**
 * Service for the user-facing system health summary used to warn that job
 * status / logs may be stale while a component is offline.
 */
@Injectable({
  providedIn: "root",
})
export class HealthService {
  private readonly healthUrl = `${environment.apiBaseUrl}/api/health/components`;
  private http = inject(HttpClient);

  /**
   * Fetch the coarse system health summary.
   * @returns Observable of ComponentsHealthResponse
   */
  getComponentsHealth(): Observable<ComponentsHealthResponse> {
    return this.http.get<ComponentsHealthResponse>(this.healthUrl);
  }
}
