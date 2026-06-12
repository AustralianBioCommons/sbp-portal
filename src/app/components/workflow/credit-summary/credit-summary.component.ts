import { Component, Input } from "@angular/core";

/**
 * Shows the computed credit cost of a workflow run, an insufficient-balance
 * warning, and the "deducted on final submission" footnote. Purely
 * presentational — the host computes `total` and supplies the user's
 * `remaining` balance.
 */
@Component({
  selector: "app-credit-summary",
  standalone: true,
  imports: [],
  templateUrl: "./credit-summary.component.html",
})
export class CreditSummaryComponent {
  /** Total credits the run will cost. Null while the cost can't be computed. */
  @Input() total: number | null = null;
  /** Remaining credit balance for the user. Null while unknown. */
  @Input() remaining: number | null = null;
  /** Trailing hint in the insufficient-credits message, e.g. "reduce the number of designs". */
  @Input() reduceHint = "reduce the size of this job";

  /** True when the cost is known to exceed the user's remaining balance. */
  get insufficient(): boolean {
    return (
      this.total !== null &&
      this.remaining !== null &&
      this.total > this.remaining
    );
  }
}
