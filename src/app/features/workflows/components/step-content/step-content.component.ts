import { Component, input, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "app-step-content",
  imports: [],
  templateUrl: "./step-content.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: "./step-content.component.scss",
})
export class StepContentComponent {
  readonly step = input<number>();
  readonly heading = input("");
  readonly description = input("");
  readonly contentClass = input("");
}
