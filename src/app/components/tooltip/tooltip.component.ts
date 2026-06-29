import {
  Component,
  DOCUMENT,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { NgIcon, provideIcons } from "@ng-icons/core";
import { heroInformationCircle } from "@ng-icons/heroicons/outline";

let nextTooltipId = 0;

@Component({
  selector: "app-tooltip",
  imports: [NgIcon],
  templateUrl: "./tooltip.component.html",
  styleUrl: "./tooltip.component.scss",
  viewProviders: [provideIcons({ heroInformationCircle })],
})
export class TooltipComponent {
  private readonly document = inject(DOCUMENT);

  message = input.required<string>();
  iconColor = input<string>("text-red-500 hover:text-red-600");
  readonly tooltipId = `app-tooltip-${nextTooltipId++}`;

  readonly open = signal(false);
  readonly left = signal(0);
  readonly top = signal(0);

  constructor() {
    const close = () => this.open.set(false);
    effect((onCleanup) => {
      if (!this.open()) return;
      this.document.addEventListener("scroll", close, true);
      this.document.defaultView?.addEventListener("resize", close);
      onCleanup(() => {
        this.document.removeEventListener("scroll", close, true);
        this.document.defaultView?.removeEventListener("resize", close);
      });
    });
  }

  show(event: Event): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.left.set(rect.left + rect.width / 2);
    this.top.set(rect.bottom + 6);
    this.open.set(true);
  }
}
