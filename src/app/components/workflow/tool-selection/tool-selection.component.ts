import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface ToolOption {
  id: string;
  label: string;
  description?: string;
}

@Component({
  selector: "app-tool-selection",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-DEFAULT-10 p-4 max-h-[70vh] overflow-auto">
      <h3 class="text-base font-semibold text-gray-900 mb-3">Select a tool</h3>
      <div class="flex flex-wrap gap-4 sm:gap-6">
        @for (tool of tools; track tool.id) {
        <div class="relative">
          <label class="flex items-center cursor-pointer gap-2">
            <input
              type="radio"
              name="selectedTool"
              [value]="tool.id"
              [checked]="selectedToolId === tool.id"
              (change)="onToolSelect(tool.id)"
              class="sr-only"
            />
            <div
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 {{
                selectedToolId === tool.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white hover:border-blue-400'
              }}"
            >
              @if (selectedToolId === tool.id) {
              <div class="w-3 h-3 rounded-full bg-white"></div>
              }
            </div>
            <span class="text-sm font-medium text-gray-900">{{
              tool.label
            }}</span>
          </label>
        </div>
        } @empty {
        <div class="text-center py-4">
          <span class="text-sm text-gray-500">No tools available</span>
        </div>
        }
      </div>
    </div>
  `,
})
export class ToolSelectionComponent {
  @Input({ required: true }) tools!: ToolOption[];
  @Input({ required: true }) selectedToolId!: string;
  @Output() toolSelect = new EventEmitter<string>();

  onToolSelect(toolId: string): void {
    this.toolSelect.emit(toolId);
  }
}
