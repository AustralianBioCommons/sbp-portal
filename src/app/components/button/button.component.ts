import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type ButtonType = "button" | "submit";
export type ButtonVariant = "primary" | "secondary";

@Component({
  selector: "app-button",
  imports: [],
  templateUrl: "./button.component.html",
  styleUrl: "./button.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  type = input<ButtonType>("button");
  variant = input<ButtonVariant>("primary");
  colorClasses = input<string | undefined>();
  widthClass = input<string>("w-28");
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
}
