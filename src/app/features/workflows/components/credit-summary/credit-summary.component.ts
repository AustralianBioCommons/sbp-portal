import { Component, computed, input } from "@angular/core";

/**
 * Shows the computed credit cost of a workflow run, an insufficient-balance
 * warning, and the "deducted on final submission" footnote. Purely
 * presentational — the host computes `total` and supplies the user's
 * `remaining` balance.
 */
@Component({
  selector: "app-credit-summary",
  imports: [],
  templateUrl: "./credit-summary.component.html",
  host: { class: "block" },
})
export class CreditSummaryComponent {
  /** Total credits the run will cost. Null while the cost can't be computed. */
  total = input<number | null>(null);
  /** Remaining credit balance for the user. Null while unknown. */
  remaining = input<number | null>(null);

  /** True when the cost is known to exceed the user's remaining balance. */
  insufficient = computed<boolean>(() => {
    const total = this.total();
    const remaining = this.remaining();
    return total !== null && remaining !== null && total > remaining;
  });
}
