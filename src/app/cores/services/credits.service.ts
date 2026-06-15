import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, Observable, of } from "rxjs";
import { environment } from "../../../environments/environment";
import { WorkflowName, WorkflowTool } from "../interfaces/workflow.interfaces";

/** Total credit allowance per user (no per-user total is stored server-side). */
export const TOTAL_CREDITS = 1000;
/** Temporary switch to keep credit UI/API work disabled while submissions run without credits. */
export const USER_CREDITS_ENABLED = false;

/** Response shape of GET /api/users/me/credit. */
export interface UserCreditResponse {
  userId: string;
  credit: number;
}

/** Credit-cost rules for a single workflow category. */
export interface WorkflowCreditConfig {
  category: WorkflowName;
  displayName: string;
  basis: string;
  /** Per-tool credit multiplier, keyed by tool id. */
  toolMultipliers: Partial<Record<WorkflowTool, number>>;
}

/** Response shape of GET /api/workflows/credits. */
export interface WorkflowCreditsResponse {
  workflows: WorkflowCreditConfig[];
}

/**
 * Dev-only dummy data so `npm start` shows the credits UI even when the
 * backend is unreachable or hasn't deployed these endpoints yet. Mirrors the
 * multipliers in sbp-backend/app/services/credits.py. Never used in production
 * builds — real failures there propagate so callers can degrade gracefully.
 */
const DEV_USER_CREDIT: UserCreditResponse = { userId: "dev-user", credit: 250 };
const DEV_WORKFLOW_CREDITS: WorkflowCreditsResponse = {
  workflows: [
    {
      category: "de-novo-design",
      displayName: "De novo Design",
      basis: "final_design_count",
      toolMultipliers: { bindcraft: 20, rfdiffusion: 10 },
    },
    {
      category: "single-prediction",
      displayName: "Single Prediction",
      basis: "constant",
      toolMultipliers: { boltz: 1, colabfold: 5, alphafold2: 5 },
    },
    {
      category: "bulk-prediction",
      displayName: "Bulk Prediction",
      basis: "fasta_entry_count",
      toolMultipliers: { boltz: 1, colabfold: 1 },
    },
    {
      category: "interaction-screening",
      displayName: "Interaction Screening",
      basis: "fasta_pair_product",
      toolMultipliers: { boltz: 1, colabfold: 1 },
    },
  ],
};

/**
 * Fetches the authenticated user's remaining credit balance and the per-tool
 * credit multipliers. The Auth0 HTTP interceptor attaches the bearer token for
 * /api/* requests.
 */
@Injectable({
  providedIn: "root",
})
export class CreditsService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl || window.location.origin;

  /** Return the current user's remaining credit balance. */
  getMyCredit(): Observable<UserCreditResponse> {
    return this.http
      .get<UserCreditResponse>(`${this.baseUrl}/api/users/me/credit`)
      .pipe(this.devFallback(DEV_USER_CREDIT));
  }

  /** Return the per-tool credit multipliers for each workflow category. */
  getWorkflowCredits(): Observable<WorkflowCreditsResponse> {
    return this.http
      .get<WorkflowCreditsResponse>(`${this.baseUrl}/api/workflows/credits`)
      .pipe(this.devFallback(DEV_WORKFLOW_CREDITS));
  }

  /**
   * In non-production builds, swallow request errors and emit dummy data so the
   * UI is previewable without a backend. In production the error propagates.
   */
  private devFallback<T>(fallback: T) {
    return catchError<T, Observable<T>>((error) => {
      if (environment.production) {
        throw error;
      }
      console.warn("Credits request failed; using dev dummy data", error);
      return of(fallback);
    });
  }
}
