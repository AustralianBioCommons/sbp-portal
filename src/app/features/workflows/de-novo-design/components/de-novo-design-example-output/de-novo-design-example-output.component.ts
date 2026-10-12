import { Component } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroArrowDownTray } from "@ng-icons/heroicons/outline";
import { ButtonComponent } from "../../../../../components/button/button.component";
import {
  ExampleOutputComponent,
  ExampleOutputImage,
} from "../../../components/example-output/example-output.component";

@Component({
  selector: "app-de-novo-design-example-output",
  imports: [ButtonComponent, ExampleOutputComponent, NgIconComponent],
  providers: [provideIcons({ heroArrowDownTray })],
  templateUrl: "./de-novo-design-example-output.component.html",
  styleUrl: "./de-novo-design-example-output.component.scss",
  host: { class: "block space-y-8 pt-4" },
})
export class DeNovoDesignExampleOutputComponent {
  readonly images = {
    structure: {
      src: "assets/dnd-example-structure.png",
      alt: "Predicted complex of the designed binder fold_16_seq_4_af2pred in orange and the protein target in blue.",
      width: 761,
      height: 750,
    },
    table: {
      src: "assets/dnd-example-table.png",
      alt: "De novo design results summary for 16 ranked designs, with Rank, PAE Interaction, ipTM, Design Length, Design Sequence and Design Name columns.",
      width: 870,
      height: 607,
    },
  } satisfies Record<string, ExampleOutputImage>;
}
