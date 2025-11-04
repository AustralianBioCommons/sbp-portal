import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

export type AlertType = "success" | "error";

@Component({
  selector: "app-alert",
  imports: [CommonModule],
  templateUrl: "./alert.component.html"
})
export class AlertComponent {
  type = input<AlertType>("error");
  message = input<string>("");
  dismissible = input<boolean>(false);

  dismissed = output<void>();

  onDismiss(): void {
    this.dismissed.emit();
  }
}
