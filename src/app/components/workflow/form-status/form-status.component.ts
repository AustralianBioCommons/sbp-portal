import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

export interface FormValidationSummary {
  valid: boolean;
  errorCount: number;
  rowCount: number;
}

@Component({
  selector: "app-form-status",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-4 p-3 bg-gray-50 rounded-DEFAULT-10">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">Form Status:</span>
        <span
          class="text-sm font-medium"
          [class]="isValid ? 'text-success' : 'text-error text-pink-600'"
        >
          {{ isValid ? "Valid" : "Invalid" }}
        </span>
      </div>

      <!-- Validation Summary -->
      <div class="mt-2 text-xs text-gray-500">
        Input configuration @if (validationSummary.errorCount > 0) { •
        {{ validationSummary.errorCount }} validation error{{
          validationSummary.errorCount !== 1 ? "s" : ""
        }}
        } @else { • All fields valid }
      </div>

      @if (!isValid && validationSummary.errorCount > 0) {
      <div class="mt-2 text-xs text-error text-pink-600">
        <p>Please fix the validation errors in the forms above.</p>
      </div>
      }
    </div>
  `,
})
export class FormStatusComponent {
  @Input({ required: true }) isValid!: boolean;
  @Input({ required: true }) validationSummary!: FormValidationSummary;
}
