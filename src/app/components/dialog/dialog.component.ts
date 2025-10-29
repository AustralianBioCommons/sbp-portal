import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ButtonComponent } from "../button/button.component";

@Component({
  selector: "app-dialog",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./dialog.component.html",
  styleUrls: ["./dialog.component.scss"],
})
export class DialogComponent {
  @Input() isOpen = false;
  @Input() title = "";
  @Input() message = "";
  @Input() confirmText = "Confirm";
  @Input() cancelText = "Cancel";
  @Input() confirmVariant: "primary" | "secondary" = "primary";
  @Input() confirmColorClasses = "";

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

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
