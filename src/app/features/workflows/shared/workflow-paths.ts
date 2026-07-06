import { WorkflowName } from "./workflow.interfaces";

export const WORKFLOW_INPUT_DIRS: Record<WorkflowName, string> = {
  "single-prediction": "input/single-prediction",
  "de-novo-design": "input/de-novo-design",
  "interaction-screening": "input/interaction-screening",
  "bulk-prediction": "input/bulk-prediction",
};
