import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CitationLinkComponent } from "../../../components/citation-link/citation-link.component";

/** About tab content for the Single Prediction workflow. */
@Component({
  selector: "app-single-prediction-about",
  imports: [CitationLinkComponent],
  templateUrl: "./single-prediction-about.component.html",
  styleUrl: "./single-prediction-about.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block space-y-8 pt-4" },
})
export class SinglePredictionAboutComponent {}
