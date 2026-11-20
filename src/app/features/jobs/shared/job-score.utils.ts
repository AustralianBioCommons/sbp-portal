export const MAX_SCORE_HINTS: Record<string, string> = {
  "De Novo Design": "Maximum ipTM score of designs passing quality filters.",
  "Single Prediction": "pTM score of prediction.",
  "Bulk Prediction": "Maximum pTM score of all predictions.",
  "Interaction Screening": "Maximum ipTM score of all predictions.",
};

export function getMaxScoreHint(workflow: string): string | undefined {
  const normalized = workflow.toLowerCase().replace(/[-_]+/g, " ").trim();
  const name = normalized === "binder design" ? "de novo design" : normalized;
  return Object.entries(MAX_SCORE_HINTS).find(
    ([label]) => label.toLowerCase() === name
  )?.[1];
}
