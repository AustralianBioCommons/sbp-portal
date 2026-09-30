import { Component, signal } from "@angular/core";
import { ThemeLayoutComponent } from "../layout/theme-layout/theme-layout.component";
import { THEMES } from "../../../core/configs/themes.config";

@Component({
  selector: "app-binder-design",
  imports: [ThemeLayoutComponent],
  templateUrl: "./binder-design.html",
  styleUrl: "./binder-design.scss",
})
export class BinderDesignComponent {
  private readonly theme = THEMES.find((t) => t.id === "binder-design")!;
  workflows = signal(this.theme.workflows);
}
