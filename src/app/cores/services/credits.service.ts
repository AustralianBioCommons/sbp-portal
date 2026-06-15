import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
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

/** Inputs for POST /api/workflows/credits/estimate (display only). */
export interface CreditEstimateRequest {
  workflow: string;
  tool: string;
  finalDesignCount?: number | null;
  fasta?: string | null;
  queryFasta?: string | null;
  targetFasta?: string | null;
}

/** Response shape of POST /api/workflows/credits/estimate. */
export interface CreditEstimateResponse {
  cost: number | null;
}

/**
 * Fetches the authenticated user's remaining credit balance and the per-tool
 * credit multipliers. The Auth0 HTTP interceptor attaches the bearer token for
 * /api/* requests. Request errors propagate to callers — there is no dummy
 * fallback, so an unavailable backend surfaces as a failed request.
 */
@Injectable({
  providedIn: "root",
})
export class CreditsService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl || window.location.origin;

  /** Return the current user's remaining credit balance. */
  getMyCredit(): Observable<UserCreditResponse> {
    return this.http.get<UserCreditResponse>(
      `${this.baseUrl}/api/users/me/credit`
    );
  }

  /** Return the per-tool credit multipliers for each workflow category. */
  getWorkflowCredits(): Observable<WorkflowCreditsResponse> {
    return this.http.get<WorkflowCreditsResponse>(
      `${this.baseUrl}/api/workflows/credits`
    );
  }

  /**
   * Estimate a run's credit cost for display. The backend is the single source
   * of truth for the calculation; authoritative deduction happens server-side
   * at launch, so this is a non-binding preview.
   */
  estimateCost(
    request: CreditEstimateRequest
  ): Observable<CreditEstimateResponse> {
    return this.http.post<CreditEstimateResponse>(
      `${this.baseUrl}/api/workflows/credits/estimate`,
      request
    );
  }
}
