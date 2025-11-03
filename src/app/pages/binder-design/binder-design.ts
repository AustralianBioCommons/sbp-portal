import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: "app-binder-design",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./binder-design.html",
  styleUrls: ["./binder-design.scss"]
})
export class BinderDesignComponent {
  private router = inject(Router);

  // Navigation methods
  navigateToWorkflow(workflowId: string) {
    console.log(`Navigating to workflow: ${workflowId}`);

    // Update active state first
    this.workflows.forEach((w) => (w.active = w.id === workflowId));

    // Navigate to the workflow route
    this.router.navigate(["/workflow", workflowId]);
  }

  navigateToTool(toolId: string) {
    console.log(`Navigating to tool: ${toolId}`);

    // Update active state first
    this.tools.forEach((t) => (t.active = t.id === toolId));

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
      active: true
    },
    {
      id: "motif-scaffolding",
      label: "Motif Scaffolding",
      href: "/workflow/motif-scaffolding",
      active: false
    },
    {
      id: "partial-diffusion",
      label: "Partial Diffusion",
      href: "/workflow/partial-diffusion",
      active: false
    }
  ];

  // Tools
  tools = [
    {
      id: "bindcraft",
      label: "BindCraft",
      href: "/tools/bindcraft",
      active: true
    },
    {
      id: "rfdiffusion",
      label: "RFdiffusion",
      href: "/tools/rfdiffusion",
      active: false
    },
    {
      id: "boltzgen",
      label: "BoltzGen",
      href: "/tools/boltzgen",
      active: false
    }
  ];

  // Community resources
  communityResources = [
    {
      title: "Documentation",
      description:
        "Comprehensive guides and tutorials for protein binder design",
      href: "/docs"
    },
    {
      title: "Community Forum",
      description: "Connect with other researchers and share insights",
      href: "/forum"
    },
    {
      title: "Best Practices",
      description: "Learn from established protocols and methodologies",
      href: "/best-practices"
    },
    {
      title: "Publication Repository",
      description: "Access relevant research papers and publications",
      href: "/publications"
    }
  ];
}
