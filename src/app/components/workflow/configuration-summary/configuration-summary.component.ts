import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

export interface SummaryItem {
  label: string;
  value: string;
  fieldName: string;
}

@Component({
  selector: "app-configuration-summary",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-4 space-y-4">
      <!-- Selected Tool -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h6 class="text-sm font-semibold text-blue-900 mb-2">Selected Tool</h6>
        <p class="text-sm text-blue-800">
          <span class="font-medium">{{ selectedTool }}</span>
          @if (hasParameters) {
          <span
            class="ml-2 text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded-full"
            >Has Parameters</span
          >
          } @else {
          <span
            class="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full"
            >No Parameters</span
          >
          }
        </p>
      </div>

      <!-- Input Configuration Summary -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h6 class="text-sm font-semibold text-gray-900 mb-3">
          Input Configuration
        </h6>
        @if (summaryItems.length > 0) {
        <div class="space-y-3">
          @for (item of summaryItems; track item.fieldName) {
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4"
          >
            <span class="text-sm font-medium text-gray-700 sm:w-1/3"
              >{{ item.label }}:</span
            >
            <span class="text-sm text-gray-600 sm:w-2/3 break-words">{{
              item.value
            }}</span>
          </div>
          }
        </div>

        <!-- Summary Stats -->
        <div class="mt-4 pt-3 border-t border-gray-200">
          <div class="flex flex-wrap gap-4 text-xs text-gray-600">
            <span>{{ summaryItems.length }} field(s) configured</span>
            <span>{{ requiredFieldCount }} required field(s)</span>
          </div>
        </div>
        } @else {
        <p class="text-sm text-gray-500 italic">
          No input configuration provided
        </p>
        }
      </div>

      <!-- Validation Status -->
      @if (isValid) {
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <span
            class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
            >✓</span
          >
          <span class="text-sm font-medium text-green-900"
            >Configuration Valid</span
          >
        </div>
        <p class="text-sm text-green-700 mt-1">
          All required fields are properly configured and ready to submit.
        </p>
      </div>
      } @else {
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <span
            class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
            >!</span
          >
          <span class="text-sm font-medium text-red-900"
            >Configuration Incomplete</span
          >
        </div>
        <p class="text-sm text-red-700 mt-1">
          Please complete all required fields in the Input Configuration step.
        </p>
      </div>
      }
    </div>
  `,
})
export class ConfigurationSummaryComponent {
  @Input({ required: true }) selectedTool!: string;
  @Input() hasParameters = false;
  @Input({ required: true }) summaryItems!: SummaryItem[];
  @Input({ required: true }) requiredFieldCount!: number;
  @Input({ required: true }) isValid!: boolean;
}
