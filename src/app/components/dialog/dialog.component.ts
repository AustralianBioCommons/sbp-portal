import { Component, input, output } from "@angular/core";

import { ButtonComponent } from "../button/button.component";

@Component({
  selector: "app-dialog",
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: "./dialog.component.html",
  styleUrls: ["./dialog.component.scss"],
})
export class DialogComponent {
  isOpen = input(false);
  title = input("");
  message = input("");
  confirmText = input("Confirm");
  cancelText = input("Cancel");

  confirmed = output<void>();
  cancelled = output<void>();
  closed = output<void>();

  onConfirm() {
    this.confirmed.emit();
    this.closed.emit();
  }

  onCancel() {
    this.cancelled.emit();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
