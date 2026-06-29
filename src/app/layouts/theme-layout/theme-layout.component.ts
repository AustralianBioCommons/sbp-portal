import { Component, computed, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ToolItem, WorkflowItem } from "../../cores/config/themes.config";

interface ThemeSection {
  heading: string;
  items: (WorkflowItem | ToolItem)[];
}

@Component({
  selector: "app-theme-layout",
  imports: [RouterLink],
  templateUrl: "./theme-layout.component.html",
  styleUrl: "./theme-layout.component.scss",
  host: { class: "block w-full" },
})
export class ThemeLayoutComponent {
  readonly title = input.required<string>();
  readonly workflows = input.required<WorkflowItem[]>();
  readonly tools = input.required<ToolItem[]>();

  protected readonly sections = computed<ThemeSection[]>(() => [
    { heading: "Workflows", items: this.workflows() },
    { heading: "Tools", items: this.tools() },
  ]);
}
