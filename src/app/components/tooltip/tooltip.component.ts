import { Component, input } from "@angular/core";
import { heroInformationCircleSolid } from "@ng-icons/heroicons/solid";
import { NgIcon, provideIcons } from "@ng-icons/core";

let nextTooltipId = 0;

@Component({
  selector: "app-tooltip",
  imports: [NgIcon],
  templateUrl: "./tooltip.component.html",
  styleUrl: "./tooltip.component.scss",
  viewProviders: [provideIcons({ heroInformationCircleSolid })],
})
export class TooltipComponent {
  message = input.required<string>();
  iconColor = input<string>("text-red-500 hover:text-red-600");
  readonly tooltipId = `app-tooltip-${nextTooltipId++}`;
}
