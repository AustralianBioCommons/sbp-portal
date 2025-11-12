import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { ButtonComponent } from "../../components/button/button.component";

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
    console.log(`Navigating to workflow: ${workflowId}`);

    // Navigate to the workflow route
    this.router.navigate(["/workflow", workflowId]);
  }

  navigateToTool(toolId: string) {
    console.log(`Navigating to tool: ${toolId}`);

    // Navigate to the tool route
    this.router.navigate(["/tools", toolId]);
  }

  navigateToResource(href: string) {
    console.log(`Navigating to resource: ${href}`);
  }

  // Preconfid workflows
  workflows = [
    {
      id: "de-novo-design",
      label: "De Novo Design",
      href: "/workflow/de-novo-design",
    },
    {
      id: "motif-scaffolding",
      label: "Motif Scaffolding",
      href: "/workflow/motif-scaffolding",
    },
    {
      id: "partial-diffusion",
      label: "Partial Diffusion",
      href: "/workflow/partial-diffusion",
    },
  ];

  // Tools
  tools = [
    {
      id: "bindcraft",
      label: "BindCraft",
      href: "/tools/bindcraft",
    },
    {
      id: "rfdiffusion",
      label: "RFdiffusion",
      href: "/tools/rfdiffusion",
    },
    {
      id: "boltzgen",
      label: "BoltzGen",
      href: "/tools/boltzgen",
    },
  ];

  // Community resources
  communityResources = [
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
  ];
}
