import { Component } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroArrowDownTray } from "@ng-icons/heroicons/outline";
import { ButtonComponent } from "../../../../components/button/button.component";
import {
  ExampleOutputComponent,
  ExampleOutputImage,
} from "../example-output/example-output.component";

/** Example Output tab content for the Single Prediction workflow. */
@Component({
  selector: "app-single-prediction-example-output",
  imports: [ButtonComponent, ExampleOutputComponent, NgIconComponent],
  providers: [provideIcons({ heroArrowDownTray })],
  templateUrl: "./single-prediction-example-output.component.html",
  styleUrl: "./single-prediction-example-output.component.scss",
  host: { class: "block space-y-8 pt-4" },
})
export class SinglePredictionExampleOutputComponent {
  /** Screenshots of an example run's results page, at their pixel sizes. */
  readonly images = {
    scores: {
      src: "assets/sp-example-iptm-ptm.png",
      alt: "Scores from the results page: ipTM = 0.91, pTM = 0.88.",
      width: 1211,
      height: 88,
    },
    structure: {
      src: "assets/sp-example-viewer.png",
      alt: "Predicted 3D structure of the example complex in the viewer, coloured by pLDDT: mostly very high confidence (dark blue), with a very low confidence tail (orange).",
      width: 712,
      height: 590,
    },
    pae: {
      src: "assets/sp-example-pae.png",
      alt: "PAE heatmap for the example two-chain complex: mostly dark green (low expected error), including the off-diagonal blocks between the chains, with a few light bands.",
      width: 480,
      height: 560,
    },
    msa: {
      src: "assets/sp-example-msa.png",
      alt: "MSA sequence coverage plot for the example: deep coverage, up to about 64,000 sequences, across most positions, with dips near positions 300 and 720 and little coverage at the chain ends.",
      width: 612,
      height: 532,
    },
  } satisfies Record<string, ExampleOutputImage>;
}
