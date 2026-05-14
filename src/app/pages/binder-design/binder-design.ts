import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { ButtonComponent } from "../../components/button/button.component";
import { THEMES } from "../../cores/config/themes.config";

@Component({
  selector: "app-binder-design",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./binder-design.html",
})
export class BinderDesignComponent {
  private router = inject(Router);

  // Navigation methods
  navigateToWorkflow(workflowId: string) {
    const workflow = this.workflows().find((item) => item.id === workflowId);
    if (!workflow || workflow.disabled) {
      return;
    }

    console.log(`Navigating to workflow: ${workflowId}`);
    this.router.navigate([`/${workflowId}`]);
  }

  navigateToTool(toolId: string) {
    const tool = this.tools().find((item) => item.id === toolId);
    if (!tool || tool.disabled) {
      return;
    }

    console.log(`Navigating to tool: ${toolId}`);

    if (toolId === "bindcraft") {
      this.router.navigate(["/de-novo-design"]);
      return;
    }

    this.router.navigate(["/tools", toolId]);
  }

  navigateToResource(href: string) {
    console.log(`Navigating to resource: ${href}`);
  }

  private readonly theme = THEMES.find((t) => t.id === "binder-design")!;
  workflows = signal(this.theme.workflows);
  tools = signal(this.theme.tools);

  // Community resources
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
