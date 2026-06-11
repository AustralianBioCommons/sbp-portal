import { Component, Input } from "@angular/core";

@Component({
  selector: "app-step-content",
  standalone: true,
  imports: [],
  template: `
    <div class="mt-4 border border-gray-200 rounded-lg p-4 bg-white">
      @if (title) {
      <h5 class="text-base font-semibold text-gray-900">{{ title }}</h5>
      } @if (description) {
      <p class="mt-1 text-sm text-gray-600">{{ description }}</p>
      }
      <div [class]="contentClass">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class StepContentComponent {
  @Input() title = "";
  @Input() description = "";
  @Input() contentClass = "";
}
