import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";

export type ButtonType = "button" | "submit";
export type ButtonVariant = "primary" | "secondary";

@Component({
  selector: "app-button",
  imports: [CommonModule],
  templateUrl: "./button.component.html",
  styleUrl: "./button.component.scss",
})
export class ButtonComponent {
  type = input<ButtonType>("button");
  variant = input<ButtonVariant>("primary");
  colorClasses = input<string | undefined>();
  widthClass = input<string>("w-28");
  borderRadius = input<string>("rounded-md");
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  active = input<boolean>(false);
  href = input<string | undefined>();
}
