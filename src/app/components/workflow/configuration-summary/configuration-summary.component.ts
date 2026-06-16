import { Component, input } from "@angular/core";

export interface SummaryItem {
  label: string;
  value: string;
  fieldName: string;
  /** Optional download URL — when set, value is rendered as a clickable link. */
  url?: string;
}

@Component({
  selector: "app-configuration-summary",
  imports: [],
  templateUrl: "./configuration-summary.component.html",
  styleUrl: "./configuration-summary.component.scss",
})
export class ConfigurationSummaryComponent {
  readonly selectedTool = input.required<string>();
  readonly hasParameters = input(false);
  readonly summaryItems = input.required<SummaryItem[]>();
  readonly requiredFieldCount = input.required<number>();
  readonly isValid = input.required<boolean>();
}
