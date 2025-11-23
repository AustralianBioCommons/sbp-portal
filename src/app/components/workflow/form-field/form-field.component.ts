import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { InputSchemaField } from "../../../cores/input-schema.service";

@Component({
  selector: "app-form-field",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <!-- Field Label -->
      <label [for]="fieldId" class="block text-sm font-medium text-gray-700">
        {{ field.label || field.name }}
        @if (field.required) {
        <span class="text-red-500 ml-1">*</span>
        } @if (field.description) {
        <div class="group relative inline-block ml-1">
          <svg
            class="w-4 h-4 text-gray-400 cursor-help"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <!-- Tooltip -->
          <div
            class="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg px-3 py-2 mt-1 left-0 min-w-[200px] max-w-[300px] shadow-lg"
          >
            <div class="font-medium">{{ field.label || field.name }}</div>
            <div class="text-gray-300 mt-1">{{ field.description }}</div>
            <div class="text-gray-400 text-xs mt-2">
              Type: {{ field.type }}
              @if (field.required) {
              <span class="text-red-400"> • Required</span>
              }
            </div>
            @if (field.validation?.min !== undefined || field.validation?.max
            !== undefined) {
            <div class="text-gray-400 text-xs mt-1">
              @if (field.validation.min !== undefined && field.validation.max
              !== undefined) { Range: {{ field.validation.min }} -
              {{ field.validation.max }} } @else if (field.validation.min !==
              undefined) { Min: {{ field.validation.min }} } @else if
              (field.validation.max !== undefined) { Max:
              {{ field.validation.max }}
              }
            </div>
            }
          </div>
        </div>
        }
      </label>

      <!-- Field Input -->
      <div class="relative">
        <!-- String Input -->
        @if (field.type === 'string' && !field.options) {
        <input
          [id]="fieldId"
          type="text"
          [class]="getInputClasses()"
          [placeholder]="
            field.placeholder ||
            'Enter ' + (field.label || field.name).toLowerCase()
          "
          [value]="value"
          [required]="field.required"
          [minlength]="field.validation?.minLength"
          [maxlength]="field.validation?.maxLength"
          [pattern]="field.validation?.pattern"
          (input)="onValueChange($any($event.target).value)"
          (blur)="onBlur()"
        />
        }

        <!-- Number Input -->
        @if (field.type === 'number') {
        <input
          [id]="fieldId"
          type="number"
          [class]="getInputClasses()"
          [placeholder]="field.placeholder || 'Enter number'"
          [min]="field.validation?.min"
          [max]="field.validation?.max"
          [step]="field.validation?.step || 'any'"
          [value]="value"
          [required]="field.required"
          (input)="onValueChange(+$any($event.target).value)"
          (blur)="onBlur()"
        />
        }

        <!-- Boolean Input -->
        @if (field.type === 'boolean') {
        <div class="flex items-center">
          <input
            [id]="fieldId"
            type="checkbox"
            [class]="
              'h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 ' +
              (hasError ? 'border-red-300' : '')
            "
            [checked]="value === true"
            (change)="onValueChange($any($event.target).checked)"
            (blur)="onBlur()"
          />
          <span class="ml-2 text-sm text-gray-600">Enable this option</span>
        </div>
        }

        <!-- Select/Options Input -->
        @if (field.options && field.options.length > 0) {
        <select
          [id]="fieldId"
          [class]="getSelectClasses()"
          [value]="value"
          [required]="field.required"
          (change)="onValueChange($any($event.target).value)"
          (blur)="onBlur()"
        >
          <option value="">Select {{ field.label || field.name }}</option>
          @for (option of field.options; track option) { @if (typeof option ===
          'string') {
          <option [value]="option">{{ option }}</option>
          } @else {
          <option [value]="option.value">
            {{ option.label || option.value }}
          </option>
          } }
        </select>
        }

        <!-- File Input -->
        @if (field.type === 'file') {
        <input
          type="file"
          [class]="getFileClasses()"
          [required]="field.required"
          [accept]="field.validation?.accept"
          (change)="onFileChange($event)"
          (blur)="onBlur()"
        />
        }

        <!-- Field Error -->
        @if (hasError && errorMessage) {
        <div class="mt-1 text-sm text-red-600">{{ errorMessage }}</div>
        }
      </div>

      <!-- Field Help Text -->
      @if (field.validation?.min !== undefined || field.validation?.max !==
      undefined) {
      <div class="text-xs text-gray-500">
        @if (field.validation.min !== undefined && field.validation.max !==
        undefined) { Range: {{ field.validation.min }} -
        {{ field.validation.max }} } @else if (field.validation.min !==
        undefined) { Minimum: {{ field.validation.min }} } @else if
        (field.validation.max !== undefined) { Maximum:
        {{ field.validation.max }}
        }
      </div>
      }
    </div>
  `,
})
export class FormFieldComponent {
  @Input({ required: true }) field!: InputSchemaField;
  @Input() value: unknown = "";
  @Input() hasError = false;
  @Input() errorMessage: string | null = null;

  @Output() valueChange = new EventEmitter<unknown>();
  @Output() fieldBlur = new EventEmitter<void>();

  get fieldId(): string {
    return `field-${this.field.name}`;
  }

  onValueChange(newValue: unknown): void {
    this.valueChange.emit(newValue);
  }

  onBlur(): void {
    this.fieldBlur.emit();
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    this.valueChange.emit(file?.name || "");
  }

  getInputClasses(): string {
    return (
      "w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
      (this.hasError
        ? "border-red-300 bg-red-50 text-red-900 placeholder-red-300"
        : "border-gray-300 bg-white text-gray-900 placeholder-gray-500")
    );
  }

  getSelectClasses(): string {
    return (
      "w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
      (this.hasError
        ? "border-red-300 bg-red-50 text-red-900"
        : "border-gray-300 bg-white text-gray-900")
    );
  }

  getFileClasses(): string {
    return (
      "w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 " +
      (this.hasError ? "file:bg-red-100 file:text-red-700" : "")
    );
  }
}
