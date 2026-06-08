import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { THEMES } from "../../cores/config/themes.config";

@Component({
  selector: "app-structure-prediction",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./structure-prediction.html",
})
export class StructurePredictionComponent {
  private readonly theme = THEMES.find((t) => t.id === "structure-prediction")!;
  workflows = this.theme.workflows;
  tools = this.theme.tools;
}
