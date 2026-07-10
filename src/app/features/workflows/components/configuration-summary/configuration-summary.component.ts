import { Component, input } from "@angular/core";

export interface SummaryItem {
  label: string;
  value: string;
  fieldName: string;
  url?: string;
}

export interface EntitySummaryItem {
  type: string;
  name: string;
  sequence: string;
}

@Component({
  selector: "app-configuration-summary",
  imports: [],
  templateUrl: "./configuration-summary.component.html",
  host: { class: "block" },
})
export class ConfigurationSummaryComponent {
  readonly workflowName = input("");
  readonly selectedTool = input.required<string>();
  readonly hasParameters = input(false);
  readonly inputItems = input.required<SummaryItem[]>();
  readonly inputEntities = input<EntitySummaryItem[]>([]);
  readonly toolSettingItems = input<SummaryItem[]>([]);
}
