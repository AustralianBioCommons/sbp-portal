import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroChevronRight } from "@ng-icons/heroicons/outline";
import { WorkflowItem } from "../../../../core/configs/themes.config";

@Component({
  selector: "app-theme-layout",
  imports: [RouterLink, NgIconComponent],
  providers: [provideIcons({ heroChevronRight })],
  templateUrl: "./theme-layout.component.html",
  styleUrl: "./theme-layout.component.scss",
  host: { class: "block w-full" },
})
export class ThemeLayoutComponent {
  readonly heading = input.required<string>();
  readonly workflows = input.required<WorkflowItem[]>();
}
