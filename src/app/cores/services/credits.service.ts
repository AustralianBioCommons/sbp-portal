import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { WorkflowName, WorkflowTool } from "../interfaces/workflow.interfaces";

/** Total credit allowance per user (no per-user total is stored server-side). */
export const TOTAL_CREDITS = 1000;
/** Temporary switch to keep credit UI/API work disabled while submissions run without credits. */
export const USER_CREDITS_ENABLED = false;

/** Shown when the backend rejects a launch for insufficient credit (HTTP 402). */
export const INSUFFICIENT_CREDITS_MESSAGE =
  "You have insufficient SBP credits to execute this workflow. Please reduce " +
  "resource requirements or come back next month when your credit allocation " +
  "is reset.";

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
 * Fetches the authenticated user's remaining credit balance and the per-tool
 * credit multipliers. The forms compute the run's display cost locally from
 * these multipliers; the backend remains the single source of truth for the
 * authoritative deduction at launch. The Auth0 HTTP interceptor attaches the
 * bearer token for /api/* requests. Request errors propagate to callers — there
 * is no dummy fallback, so an unavailable backend surfaces as a failed request.
 *
 * The remaining balance is held in a shared signal so the navbar and the
 * workflow forms stay in sync; call refreshBalance() after a launch (the backend
 * deducts credits server-side) to reflect the new balance everywhere.
 */
@Injectable({
  providedIn: "root",
})
export class CreditsService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl || window.location.origin;

  private readonly balanceSignal = signal<number | null>(null);
  /**
   * Shared, reactive remaining-credit balance. Kept current by getMyCredit() /
   * refreshBalance() so the navbar and forms reflect the latest value.
   */
  readonly balance = this.balanceSignal.asReadonly();

  /** Clear the cached balance (e.g. on logout). */
  clearBalance(): void {
    this.balanceSignal.set(null);
  }

  /**
   * Re-fetch the remaining balance and update the shared signal. Errors are
   * swallowed (logged) so a refresh failure never breaks the calling flow.
   */
  refreshBalance(): void {
    this.getMyCredit().subscribe({
      error: (error) => console.warn("Failed to refresh credit balance", error),
    });
  }

  /**
   * Return the current user's remaining credit balance, updating the shared
   * balance signal as a side effect.
   */
  getMyCredit(): Observable<UserCreditResponse> {
    return this.http
      .get<UserCreditResponse>(`${this.baseUrl}/api/users/me/credit`)
      .pipe(tap((res) => this.balanceSignal.set(res.credit)));
  }

  /** Return the per-tool credit multipliers for each workflow category. */
  getWorkflowCredits(): Observable<WorkflowCreditsResponse> {
    return this.http.get<WorkflowCreditsResponse>(
      `${this.baseUrl}/api/workflows/credits`
    );
  }
}
