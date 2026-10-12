import { Component, computed, input } from "@angular/core";
import { TooltipComponent } from "../tooltip/tooltip.component";

export interface PredictionConfidenceScore {
  label: string;
  value: string;
  hint: string;
}

export const PREDICTION_SCORE_HINTS = {
  ipTM: "Predicted TM-score across the chain interfaces (0–1, higher is better)",
  pTM: "Predicted TM-score for the structure as a whole (0–1, higher is better)",
} as const;

@Component({
  selector: "app-prediction-confidence-scores",
  imports: [TooltipComponent],
  templateUrl: "./prediction-confidence-scores.component.html",
  styleUrl: "./prediction-confidence-scores.component.scss",
  host: { class: "block" },
})
export class PredictionConfidenceScoresComponent {
  readonly scores = input.required<readonly PredictionConfidenceScore[]>();
  readonly showTooltip = input(true);

  readonly scoresHint = computed(() =>
    this.scores()
      .map((score) => `${score.label}: ${score.hint}`)
      .join("\n\n")
  );
}
