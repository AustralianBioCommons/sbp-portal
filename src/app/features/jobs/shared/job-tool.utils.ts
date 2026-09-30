const TOOL_LABELS: Record<string, string> = {
  alphafold2: "AlphaFold2",
  bindcraft: "BindCraft",
  boltz: "Boltz",
  colabfold: "ColabFold",
  rfdiffusion: "RFdiffusion",
};

/** Canonical display casing for a tool name, shared by the jobs list and job details. */
export function formatToolName(tool: string): string {
  return TOOL_LABELS[tool.toLowerCase()] ?? tool;
}
