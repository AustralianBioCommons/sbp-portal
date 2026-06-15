import {
  Component,
  TemplateRef,
  input,
  model,
  contentChild,
  effect,
  ElementRef,
  Renderer2,
  inject,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";

@Component({
  selector: "app-dropdown-menu",
  imports: [NgTemplateOutlet],
  templateUrl: "./dropdown-menu.component.html",
  styleUrl: "./dropdown-menu.component.css",
  host: {
    "(keydown.escape)": "close()",
  },
})
export class DropdownMenuComponent {
  readonly isOpen = model<boolean>(false);
  readonly widthClass = input<string>("w-60");

  readonly triggerTemplate = contentChild<TemplateRef<unknown>>("trigger");
  readonly menuTemplate = contentChild<TemplateRef<unknown>>("menu");

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  constructor() {
    effect((onCleanup) => {
      if (!this.isOpen()) return;

      const remove = this.renderer.listen(
        "document",
        "pointerdown",
        (event: Event) => {
          const target = event.target as HTMLElement | null;
          if (target && !this.elementRef.nativeElement.contains(target)) {
            this.close();
          }
        },
        { capture: true }
      );

      onCleanup(remove);
    });
  }

  toggle() {
    this.isOpen.set(!this.isOpen());
  }

  close() {
    this.isOpen.set(false);
  }
}
