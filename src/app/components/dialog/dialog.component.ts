import {
  Component,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  output,
  Renderer2,
  viewChild,
} from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroExclamationTriangle } from "@ng-icons/heroicons/outline";

import { ButtonComponent } from "../button/button.component";

export type DialogVariant = "default" | "danger";

@Component({
  selector: "app-dialog",
  imports: [ButtonComponent, NgIconComponent],
  providers: [provideIcons({ heroExclamationTriangle })],
  templateUrl: "./dialog.component.html",
  styleUrl: "./dialog.component.scss",
})
export class DialogComponent {
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  isOpen = input(false);
  title = input("");
  message = input("");
  confirmText = input("Confirm");
  cancelText = input("Cancel");
  variant = input<DialogVariant>("default");
  loading = input(false);

  confirmed = output<void>();
  cancelled = output<void>();
  closed = output<void>();

  private dialogRef = viewChild<ElementRef<HTMLDialogElement>>("dialog");

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) {
        return;
      }

      if (this.isOpen()) {
        if (!dialog.open) {
          dialog.showModal();
        }
        this.renderer.setStyle(this.document.body, "overflow", "hidden");
      } else {
        if (dialog.open) {
          dialog.close();
        }
        this.renderer.removeStyle(this.document.body, "overflow");
      }
    });
  }

  onConfirm() {
    this.confirmed.emit();
    this.closed.emit();
  }

  onCancel() {
    this.cancelled.emit();
    this.closed.emit();
  }

  onDialogCancel(event: Event) {
    event.preventDefault();
    if (this.loading()) {
      return;
    }
    this.onCancel();
  }

  onDialogClick(event: MouseEvent) {
    if (this.loading()) {
      return;
    }
    if (event.target === this.dialogRef()?.nativeElement) {
      this.onCancel();
    }
  }
}
