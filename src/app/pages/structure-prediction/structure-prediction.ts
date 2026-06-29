import { Component } from "@angular/core";
import { ThemeLayoutComponent } from "../../layouts/theme-layout/theme-layout.component";
import { THEMES } from "../../cores/config/themes.config";

@Component({
  selector: "app-structure-prediction",
  imports: [ThemeLayoutComponent],
  templateUrl: "./structure-prediction.html",
  styleUrl: "./structure-prediction.scss",
})
export class StructurePredictionComponent {
  private readonly theme = THEMES.find((t) => t.id === "structure-prediction")!;
  workflows = this.theme.workflows;
  tools = this.theme.tools;
}
