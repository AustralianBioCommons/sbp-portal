import { Component, input, output } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroExclamationTriangle } from "@ng-icons/heroicons/outline";

import { ButtonComponent } from "../button/button.component";
import { ModalComponent } from "../modal/modal.component";

export type DialogVariant = "default" | "danger";

@Component({
  selector: "app-dialog",
  imports: [ModalComponent, ButtonComponent, NgIconComponent],
  providers: [provideIcons({ heroExclamationTriangle })],
  templateUrl: "./dialog.component.html",
  styleUrl: "./dialog.component.scss",
})
export class DialogComponent {
  isOpen = input(false);
  heading = input("");
  message = input("");
  confirmText = input("Confirm");
  cancelText = input("Cancel");
  variant = input<DialogVariant>("default");
  loading = input(false);

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
}
