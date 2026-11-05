import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroArrowDownTray } from "@ng-icons/heroicons/outline";
import { ButtonComponent } from "../../../../../components/button/button.component";
import { PlddtLegendComponent } from "../../../../jobs/components/plddt-legend/plddt-legend.component";
import {
  ExampleOutputComponent,
  ExampleOutputImage,
} from "../../../components/example-output/example-output.component";

@Component({
  selector: "app-bulk-prediction-example-output",
  imports: [
    ButtonComponent,
    ExampleOutputComponent,
    NgIconComponent,
    PlddtLegendComponent,
    RouterLink,
  ],
  providers: [provideIcons({ heroArrowDownTray })],
  templateUrl: "./bulk-prediction-example-output.component.html",
  styleUrl: "./bulk-prediction-example-output.component.scss",
  host: { class: "block space-y-8" },
})
export class BulkPredictionExampleOutputComponent {
  readonly images = {
    structure: {
      src: "assets/bp-example-structure.png",
      alt: "Predicted structure from the bulk prediction example, coloured by pLDDT: mostly dark blue, indicating very high confidence.",
      width: 780,
      height: 666,
    },
    table: {
      src: "assets/bp-example-table.png",
      alt: "Bulk prediction results summary for 11 predictions, with Query ID, pTM and pLDDT columns.",
      width: 430,
      height: 595,
    },
  } satisfies Record<string, ExampleOutputImage>;
}
