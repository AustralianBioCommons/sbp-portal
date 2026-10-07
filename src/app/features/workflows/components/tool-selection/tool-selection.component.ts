import { Component, input, inject, signal } from "@angular/core";
import { ControlValueAccessor, NgControl } from "@angular/forms";

export interface ToolOption<ToolId extends string = string> {
  id: ToolId;
  label: string;
  description?: string;
  /** Starting credit cost for running this tool. When set, shown as "from N credit(s)". */
  credits?: number;
}

export function getToolLabel<ToolId extends string>(
  tools: ToolOption<ToolId>[],
  toolId: ToolId | null
): string {
  return tools.find((tool) => tool.id === toolId)?.label ?? "";
}

let nextToolSelectionId = 0;

@Component({
  selector: "app-tool-selection",
  host: { class: "block" },
  imports: [],
  templateUrl: "./tool-selection.component.html",
  styleUrl: "./tool-selection.component.scss",
})
export class ToolSelectionComponent<ToolId extends string = string>
  implements ControlValueAccessor
{
  readonly tools = input.required<ToolOption<ToolId>[]>();
  readonly name = input(`selectedTool-${nextToolSelectionId++}`);
  readonly requiredErrorMessage = input("Select a tool to continue.");

  private readonly ngControl = inject(NgControl, {
    optional: true,
    self: true,
  });

  readonly selectedToolId = signal<ToolId | null>(null);
  readonly disabled = signal(false);
  readonly errorId = `tool-selection-error-${nextToolSelectionId++}`;

  private onChange: (toolId: ToolId | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  writeValue(toolId: ToolId | null): void {
    this.selectedToolId.set(toolId);
  }

  registerOnChange(fn: (toolId: ToolId | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  showRequiredError(): boolean {
    const control = this.ngControl?.control;
    return !!(
      control?.hasError("required") &&
      (control.touched || control.dirty)
    );
  }

  onToolSelect(toolId: ToolId): void {
    if (this.disabled()) return;
    this.selectedToolId.set(toolId);
    this.onChange(toolId);
    this.onTouched();
  }

  markAsTouched(): void {
    this.onTouched();
  }
}
