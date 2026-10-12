import {
  Component,
  ChangeDetectionStrategy,
  computed,
  signal,
} from "@angular/core";
import { CitationLinkComponent } from "../../../components/citation-link/citation-link.component";

type ToolParameterTabId = "alphafold2" | "colabfold" | "boltz";

interface ToolParameterRow {
  input: string;
  description: string;
  formatAndLimits: readonly string[];
}

interface ToolParameterTab {
  id: ToolParameterTabId;
  label: string;
  rows: readonly ToolParameterRow[];
}

/** About tab content for the Single Prediction workflow. */
@Component({
  selector: "app-single-prediction-about",
  imports: [CitationLinkComponent],
  templateUrl: "./single-prediction-about.component.html",
  styleUrl: "./single-prediction-about.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block space-y-8 pt-4" },
})
export class SinglePredictionAboutComponent {
  protected readonly toolParameterTabs: readonly ToolParameterTab[] = [
    {
      id: "alphafold2",
      label: "AlphaFold2",
      rows: [
        {
          input: "Random Seed",
          description:
            "Reusing a fixed seed supports reproducibility when the same inputs and settings are used.",
          formatAndLimits: ["Integer with maximum 8 digits."],
        },
        {
          input: "Full DBs",
          description:
            "Full BFD database is used for homolog search to improve search sensitivity for MSA generation.",
          formatAndLimits: ["Boolean."],
        },
      ],
    },
    {
      id: "colabfold",
      label: "ColabFold",
      rows: [
        {
          input: "Random Seed",
          description:
            "Reusing a fixed seed supports reproducibility when the same inputs and settings are used.",
          formatAndLimits: ["Integer with maximum 8 digits."],
        },
        {
          input: "Recycles",
          description:
            "Number of recycling iterations through the neural network model. Increasing recycles can improve prediction quality but slows down the prediction.",
          formatAndLimits: ["Integer.", "Minimum: 1", "Maximum: 10"],
        },
      ],
    },
    {
      id: "boltz",
      label: "Boltz",
      rows: [
        {
          input: "Random Seed",
          description:
            "Reusing a fixed seed supports reproducibility when the same inputs and settings are used.",
          formatAndLimits: ["Integer with maximum 8 digits."],
        },
        {
          input: "Use Potentials",
          description:
            "Steering potentials can be used by Boltz to improve the physical validity of output predictions (ie steric clashes, incorrect chirality etc).",
          formatAndLimits: [
            "Boolean.",
            "Steering potentials increase VRAM requirements of Boltz predictions which reduces maximum size to 2000.",
          ],
        },
      ],
    },
  ];

  protected readonly activeToolParameterTab =
    signal<ToolParameterTabId>("alphafold2");

  protected readonly activeToolParameters = computed(
    () =>
      this.toolParameterTabs.find(
        (tab) => tab.id === this.activeToolParameterTab()
      ) ?? this.toolParameterTabs[0]
  );

  protected selectToolParameterTab(tabId: ToolParameterTabId): void {
    this.activeToolParameterTab.set(tabId);
  }
}
