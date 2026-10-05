import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

/** About tab content for the Interaction Screening workflow. */
@Component({
  selector: "app-interaction-screening-about",
  imports: [RouterLink],
  templateUrl: "./interaction-screening-about.component.html",
  styleUrl: "./interaction-screening-about.component.scss",
  host: { class: "block space-y-8 pt-4" },
})
export class InteractionScreeningAboutComponent {}
