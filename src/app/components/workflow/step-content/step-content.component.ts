import { Component, input } from "@angular/core";

@Component({
  selector: "app-step-content",
  imports: [],
  templateUrl: "./step-content.component.html",
  styleUrl: "./step-content.component.scss",
})
export class StepContentComponent {
  readonly title = input("");
  readonly description = input("");
  readonly contentClass = input("");
}
