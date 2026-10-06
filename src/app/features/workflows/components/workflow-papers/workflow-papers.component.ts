import { Component, computed, input } from "@angular/core";
import { WorkflowTool } from "../../shared/workflow.interfaces";

export type CitedTool = Extract<
  WorkflowTool,
  "alphafold2" | "boltz" | "colabfold"
>;

interface ToolCitation {
  label: string;
  reference: string;
  doi: string;
}

const CITATIONS: Record<CitedTool, ToolCitation> = {
  colabfold: {
    label: "ColabFold",
    reference:
      "Mirdita, M., Schütze, K., Moriwaki, Y. et al. ColabFold: making protein folding accessible to all. Nat Methods 19, 679–682 (2022).",
    doi: "https://doi.org/10.1038/s41592-022-01488-1",
  },
  alphafold2: {
    label: "AlphaFold2",
    reference:
      "Jumper, J., Evans, R., Pritzel, A. et al. Highly accurate protein structure prediction with AlphaFold. Nature 596, 583–589 (2021).",
    doi: "https://doi.org/10.1038/s41586-021-03819-2",
  },
  boltz: {
    label: "Boltz-2",
    reference:
      "Passaro, S., Corso, G., Wohlwend, J. et al. Boltz-2: Towards Accurate and Efficient Binding Affinity Prediction. bioRxiv 2025.06.14.659707 (2025).",
    doi: "https://doi.org/10.1101/2025.06.14.659707",
  },
};

/** Papers tab content: how to cite each tool a structure prediction workflow offers. */
@Component({
  selector: "app-workflow-papers",
  templateUrl: "./workflow-papers.component.html",
  styleUrl: "./workflow-papers.component.scss",
  host: { class: "block space-y-4 pt-4 text-sm text-gray-500" },
})
export class WorkflowPapersComponent {
  /** Name used in the intro sentence. */
  readonly workflowName = input.required<string>();
  /** Tools to cite, in display order. */
  readonly tools = input.required<readonly CitedTool[]>();

  readonly citations = computed(() =>
    this.tools().map((tool) => CITATIONS[tool])
  );
}
