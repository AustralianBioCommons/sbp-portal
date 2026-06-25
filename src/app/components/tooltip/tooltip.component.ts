import { Component, input } from "@angular/core";
import { NgIcon, provideIcons } from "@ng-icons/core";
import { heroInformationCircle } from "@ng-icons/heroicons/outline";

let nextTooltipId = 0;

@Component({
  selector: "app-tooltip",
  imports: [NgIcon],
  templateUrl: "./tooltip.component.html",
  styleUrl: "./tooltip.component.scss",
  viewProviders: [provideIcons({ heroInformationCircle })],
})
export class TooltipComponent {
  message = input.required<string>();
  iconColor = input<string>("text-red-500 hover:text-red-600");
  readonly tooltipId = `app-tooltip-${nextTooltipId++}`;
}
