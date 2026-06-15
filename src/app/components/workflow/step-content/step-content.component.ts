import { Component, input } from "@angular/core";

@Component({
  selector: "app-step-content",
  standalone: true,
  imports: [],
  templateUrl: "./step-content.component.html",
})
export class StepContentComponent {
  readonly title = input("");
  readonly description = input("");
  readonly contentClass = input("");
}
