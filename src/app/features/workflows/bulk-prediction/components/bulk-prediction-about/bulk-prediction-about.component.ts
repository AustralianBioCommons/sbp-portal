import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

/** About tab content for the Bulk Prediction workflow. */
@Component({
  selector: "app-bulk-prediction-about",
  imports: [RouterLink],
  templateUrl: "./bulk-prediction-about.component.html",
  styleUrl: "./bulk-prediction-about.component.scss",
  host: { class: "block space-y-8 pt-4" },
})
export class BulkPredictionAboutComponent {}
