import { Component, ChangeDetectionStrategy } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CitationLinkComponent } from "../../../components/citation-link/citation-link.component";

/** About tab content for the Interaction Screening workflow. */
@Component({
  selector: "app-interaction-screening-about",
  imports: [RouterLink, CitationLinkComponent],
  templateUrl: "./interaction-screening-about.component.html",
  styleUrl: "./interaction-screening-about.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block space-y-8 pt-4" },
})
export class InteractionScreeningAboutComponent {}
