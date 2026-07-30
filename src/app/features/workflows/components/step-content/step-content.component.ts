import { Component, input } from "@angular/core";

@Component({
  selector: "app-step-content",
  imports: [],
  templateUrl: "./step-content.component.html",
  styleUrl: "./step-content.component.scss",
})
export class StepContentComponent {
  readonly step = input<number>();
  readonly heading = input("");
  readonly description = input("");
  readonly contentClass = input("");
}
