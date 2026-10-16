import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroArrowDownTray } from "@ng-icons/heroicons/outline";
import { ButtonComponent } from "../../../../../components/button/button.component";
import {
  ExampleOutputComponent,
  ExampleOutputImage,
} from "../../../components/example-output/example-output.component";

@Component({
  selector: "app-interaction-screening-example-output",
  imports: [
    ButtonComponent,
    ExampleOutputComponent,
    NgIconComponent,
    RouterLink,
  ],
  providers: [provideIcons({ heroArrowDownTray })],
  templateUrl: "./interaction-screening-example-output.component.html",
  styleUrl: "./interaction-screening-example-output.component.scss",
  host: { class: "block space-y-8" },
})
export class InteractionScreeningExampleOutputComponent {
  readonly images = {
    structure: {
      src: "assets/is-example-structure.png",
      alt: "Predicted complex from the interaction screening example, with the query protein in orange and the target protein in blue.",
      width: 735,
      height: 638,
    },
    table: {
      src: "assets/is-example-table.png",
      alt: "Interaction screening results summary for 999 interactions, with Query ID, Target ID, ipSAE, ipTM and pTM columns.",
      width: 513,
      height: 572,
    },
  } satisfies Record<string, ExampleOutputImage>;
}
