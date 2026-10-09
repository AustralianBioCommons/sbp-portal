import { Component, ChangeDetectionStrategy } from "@angular/core";

/** About tab content for the De Novo Design workflow. */
@Component({
  selector: "app-de-novo-design-about",
  templateUrl: "./de-novo-design-about.component.html",
  styleUrl: "./de-novo-design-about.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block space-y-8 pt-4" },
})
export class DeNovoDesignAboutComponent {}
