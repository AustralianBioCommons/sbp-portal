import { Component, input, output } from "@angular/core";

export interface ToolOption<ToolId extends string = string> {
  id: ToolId;
  label: string;
  description?: string;
  /** Starting credit cost for running this tool. When set, shown as "from N credit(s)". */
  credits?: number;
}

@Component({
  selector: "app-tool-selection",
  imports: [],
  templateUrl: "./tool-selection.component.html",
})
export class ToolSelectionComponent<ToolId extends string = string> {
  readonly tools = input.required<ToolOption<ToolId>[]>();
  readonly selectedToolId = input.required<ToolId>();
  readonly toolSelect = output<ToolId>();

  onToolSelect(toolId: ToolId): void {
    this.toolSelect.emit(toolId);
  }
}
