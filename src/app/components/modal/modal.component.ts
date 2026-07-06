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

@Component({
  selector: "app-modal",
  imports: [],
  templateUrl: "./modal.component.html",
  styleUrl: "./modal.component.scss",
})
export class ModalComponent {
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  readonly isOpen = input(false);
  readonly dismissible = input(true);
  readonly ariaLabelledby = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly panelClass = input("w-11/12 max-w-md");

  readonly dismissed = output<void>();

  private readonly dialogRef =
    viewChild<ElementRef<HTMLDialogElement>>("dialog");

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

  onCancel(event: Event): void {
    event.preventDefault();
    if (!this.dismissible()) {
      return;
    }
    this.dismissed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.dismissible()) {
      return;
    }
    if (event.target === this.dialogRef()?.nativeElement) {
      this.dismissed.emit();
    }
  }
}
