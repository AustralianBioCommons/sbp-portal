import {
  afterNextRender,
  Component,
  ElementRef,
  viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroArrowRight } from "@ng-icons/heroicons/outline";

@Component({
  selector: "app-home",
  imports: [RouterLink, NgIconComponent],
  providers: [provideIcons({ heroArrowRight })],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
  host: { class: "block" },
})
export default class HomeComponent {
  private readonly heading =
    viewChild.required<ElementRef<HTMLHeadingElement>>("heading");

  constructor() {
    afterNextRender(() =>
      this.heading().nativeElement.focus({ preventScroll: true })
    );
  }
}
