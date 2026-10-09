import { WorkflowTool } from "./workflow.interfaces";

export type CitedTool = Extract<
  WorkflowTool,
  "alphafold2" | "boltz" | "colabfold" | "bindcraft"
>;

export interface ToolCitation {
  label: string;
  reference: string;
  doi: string;
}

const CITATIONS: Record<CitedTool, ToolCitation> = {
  colabfold: {
    label: "ColabFold",
    reference:
      "Mirdita, M., Schütze, K., Moriwaki, Y. et al. ColabFold: making protein folding accessible to all. Nat Methods 19, 679-682 (2022).",
    doi: "https://doi.org/10.1038/s41592-022-01488-1",
  },
  alphafold2: {
    label: "AlphaFold2",
    reference:
      "Jumper, J., Evans, R., Pritzel, A. et al. Highly accurate protein structure prediction with AlphaFold. Nature 596, 583-589 (2021).",
    doi: "https://doi.org/10.1038/s41586-021-03819-2",
  },
  boltz: {
    label: "Boltz-2",
    reference:
      "Passaro, S., Corso, G., Wohlwend, J. et al. Boltz-2: Towards Accurate and Efficient Binding Affinity Prediction. bioRxiv 2025.06.14.659707 (2025).",
    doi: "https://doi.org/10.1101/2025.06.14.659707",
  },
  bindcraft: {
    label: "BindCraft",
    reference: "BindCraft: one-shot design of functional protein binders",
    doi: "https://doi.org/10.1101/2024.09.30.615802",
  },
};

export function normalizeTool(tool: string | undefined): string {
  return (tool ?? "").trim().toLowerCase();
}

export function isCitedTool(tool: string | undefined): tool is CitedTool {
  return normalizeTool(tool) in CITATIONS;
}

export function getToolCitation(tool: string | undefined): ToolCitation | null {
  const normalized = normalizeTool(tool);
  return isCitedTool(normalized) ? CITATIONS[normalized] : null;
}

export function getToolCitations(tools: readonly string[]): ToolCitation[] {
  return tools
    .map((tool) => getToolCitation(tool))
    .filter((citation): citation is ToolCitation => citation !== null);
}
