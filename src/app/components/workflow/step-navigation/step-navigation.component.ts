import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonComponent } from "../../button/button.component";

export interface Step {
  id: number;
  title: string;
  description: string;
}

@Component({
  selector: "app-step-navigation",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <!-- Stepper header -->
    <ol
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4 rounded-DEFAULT-10 border border-gray-200"
    >
      @for (s of steps; track s.id) {
      <li class="flex items-center gap-2">
        <app-button
          type="button"
          variant="secondary"
          (click)="onStepClick(s.id)"
          [disabled]="isDisabled"
          borderRadius="rounded-DEFAULT-10"
          widthClass="w-full"
          colorClasses="flex items-center gap-2 p-2 border transition-colors disabled:opacity-60 disabled:cursor-not-allowed {{
            isStepInvalid(s.id)
              ? 'border-red-500 bg-red-50 text-red-700'
              : currentStep === s.id
              ? 'border-blue-500 bg-white text-primary'
              : currentStep !== s.id && isStepComplete(s.id)
              ? 'border-teal-500 bg-teal-500/5 text-gray-700'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
          }}"
        >
          <span
            class="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full"
            [ngClass]="{
              'bg-blue-500 text-white':
                currentStep === s.id && !isStepInvalid(s.id),
              'bg-red-500 text-white': isStepInvalid(s.id),
              'bg-teal-500 text-white':
                isStepComplete(s.id) &&
                currentStep !== s.id &&
                !isStepInvalid(s.id),
              'bg-white border border-gray-200 text-gray-600':
                !isStepComplete(s.id) &&
                currentStep !== s.id &&
                !isStepInvalid(s.id)
            }"
          >
            @if (isStepInvalid(s.id)) { ! } @else if (isStepComplete(s.id) &&
            currentStep !== s.id) { ✓ } @else { {{ s.id }} }
          </span>
          <span class="text-sm">{{ s.title }}</span>
        </app-button>
      </li>
      } @empty {
      <li class="text-sm text-gray-500">No steps defined</li>
      }
    </ol>
  `,
})
export class StepNavigationComponent {
  @Input({ required: true }) steps!: Step[];
  @Input({ required: true }) currentStep!: number;
  @Input() isDisabled = false;
  @Input({ required: true }) isStepInvalid!: (stepId: number) => boolean;
  @Input({ required: true }) isStepComplete!: (stepId: number) => boolean;
  @Output() stepClick = new EventEmitter<number>();

  onStepClick(stepId: number): void {
    this.stepClick.emit(stepId);
  }
}
