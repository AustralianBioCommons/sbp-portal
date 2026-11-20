import { getMaxScoreHint } from "./job-score.utils";

describe("getMaxScoreHint", () => {
  for (const [workflow, hint] of [
    ["Single Prediction", "pTM score of prediction."],
    ["bulk-prediction", "Maximum pTM score of all predictions."],
    ["INTERACTION_SCREENING", "Maximum ipTM score of all predictions."],
    ["binder-design", "Maximum ipTM score of designs passing quality filters."],
    [
      "De Novo Design",
      "Maximum ipTM score of designs passing quality filters.",
    ],
  ]) {
    it(`explains the Max score for ${workflow}`, () => {
      expect(getMaxScoreHint(workflow)).toBe(hint);
    });
  }

  it("does not guess the score meaning for missing or unknown workflows", () => {
    expect(getMaxScoreHint("")).toBeUndefined();
    expect(getMaxScoreHint("Some Other Workflow")).toBeUndefined();
  });
});
