import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface ToolOption {
  id: string;
  label: string;
  description?: string;
}

@Component({
  selector: "app-tool-selection",
  standalone: true,
  imports: [],
  templateUrl: "./tool-selection.component.html",
})
export class ToolSelectionComponent {
  @Input({ required: true }) tools!: ToolOption[];
  @Input({ required: true }) selectedToolId!: string;
  @Output() toolSelect = new EventEmitter<string>();

  onToolSelect(toolId: string): void {
    this.toolSelect.emit(toolId);
  }
}
