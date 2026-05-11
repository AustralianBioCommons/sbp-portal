import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";

export interface Step {
  id: number;
  title: string;
  description: string;
}

@Component({
  selector: "app-step-navigation",
  imports: [],
  templateUrl: "./step-navigation.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepNavigationComponent {
  readonly steps = input.required<Step[]>();
  readonly currentStep = input.required<number>();
  readonly isDisabled = input(false);
  readonly isStepInvalid = input.required<(stepId: number) => boolean>();
  readonly isStepCompleted = input.required<(stepId: number) => boolean>();
  readonly isStepVisited = input.required<(stepId: number) => boolean>();
  readonly stepClick = output<number>();

  onStepClick(stepId: number): void {
    this.stepClick.emit(stepId);
  }
}
