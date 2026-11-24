import {
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import { NgIcon, provideIcons } from "@ng-icons/core";
import { heroInformationCircle } from "@ng-icons/heroicons/outline";

let nextTooltipId = 0;

@Component({
  selector: "app-tooltip",
  imports: [NgIcon],
  templateUrl: "./tooltip.component.html",
  styleUrl: "./tooltip.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  viewProviders: [provideIcons({ heroInformationCircle })],
})
export class TooltipComponent {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private trigger: HTMLElement | null = null;

  message = input.required<string>();
  iconColor = input<string>("text-gray-500 hover:text-gray-600");
  readonly tooltipId = `app-tooltip-${nextTooltipId++}`;

  readonly open = signal(false);
  readonly left = signal(0);
  readonly top = signal(0);

  constructor() {
    afterNextRender(() => this.describeTrigger());

    const close = () => this.open.set(false);
    effect((onCleanup) => {
      if (!this.open()) return;
      const onScroll = () => {
        const trigger = this.trigger;
        if (trigger?.contains(this.document.activeElement))
          this.position(trigger);
        else close();
      };
      this.document.addEventListener("scroll", onScroll, true);
      this.document.defaultView?.addEventListener("resize", close);
      onCleanup(() => {
        this.document.removeEventListener("scroll", onScroll, true);
        this.document.defaultView?.removeEventListener("resize", close);
      });
    });
  }

  /** Link a projected trigger's accessible description to the tooltip. */
  private describeTrigger(): void {
    const trigger = this.host.nativeElement.querySelector(
      "button, a[href], input, select, textarea, [tabindex]"
    );
    if (trigger && !trigger.hasAttribute("aria-describedby")) {
      trigger.setAttribute("aria-describedby", this.tooltipId);
    }
  }

  show(event: Event): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.position(this.trigger);
    this.open.set(true);
    afterNextRender(
      () => {
        if (this.open() && this.trigger) this.position(this.trigger);
      },
      { injector: this.injector }
    );
  }

  private position(trigger: HTMLElement): void {
    const rect = trigger.getBoundingClientRect();
    this.left.set(rect.left + rect.width / 2);
    this.top.set(rect.bottom + 6);
  }
}
