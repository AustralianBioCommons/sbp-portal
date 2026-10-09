import { NgOptimizedImage, NgTemplateOutlet } from "@angular/common";
import {
  Component,
  ElementRef,
  Injector,
  Signal,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroChevronDoubleLeft,
  heroPhoto,
  heroXMark,
} from "@ng-icons/heroicons/outline";

export interface ExampleOutputImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

let nextExampleOutputId = 0;

/**
 * One output on a workflow's Example Output tab: an image with the projected
 * explanation beside it.
 */
@Component({
  selector: "app-example-output",
  imports: [NgOptimizedImage, NgTemplateOutlet, NgIconComponent],
  providers: [provideIcons({ heroChevronDoubleLeft, heroPhoto, heroXMark })],
  templateUrl: "./example-output.component.html",
  styleUrl: "./example-output.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
})
export class ExampleOutputComponent {
  private readonly injector = inject(Injector);
  private readonly openButton =
    viewChild<ElementRef<HTMLButtonElement>>("openButton");
  private readonly closeButton =
    viewChild<ElementRef<HTMLButtonElement>>("closeButton");

  readonly heading = input.required<string>();
  /** Until it is set, a placeholder stands in for the image. */
  readonly image = input<ExampleOutputImage>();
  /** A wide strip shown above the image, such as the results page's scores. Hidden on phones, where its text would be cut off. */
  readonly banner = input<ExampleOutputImage>();
  /** Shows the explanation in a side panel that can be closed, like de novo design's. */
  readonly collapsible = input(false, { transform: booleanAttribute });

  readonly expanded = signal(true);
  readonly panelId = `example-output-panel-${nextExampleOutputId++}`;

  open(): void {
    this.expanded.set(true);
    this.focusAfterRender(this.closeButton);
  }

  close(): void {
    this.expanded.set(false);
    this.focusAfterRender(this.openButton);
  }

  /** The pressed button disappears, so focus moves to the one that replaces it. */
  private focusAfterRender(
    button: Signal<ElementRef<HTMLButtonElement> | undefined>
  ): void {
    afterNextRender(() => button()!.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
