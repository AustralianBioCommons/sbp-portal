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

  communityResources = signal([
    {
      title: "Documentation",
      description:
        "Comprehensive guides and tutorials for protein binder design",
      href: "/docs",
    },
    {
      title: "Community Forum",
      description: "Connect with other researchers and share insights",
      href: "/forum",
    },
    {
      title: "Best Practices",
      description: "Learn from established protocols and methodologies",
      href: "/best-practices",
    },
    {
      title: "Publication Repository",
      description: "Access relevant research papers and publications",
      href: "/publications",
    },
  ]);
}
