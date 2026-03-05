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
    const workflow = this.workflows.find((item) => item.id === workflowId);
    if (!workflow || workflow.disabled) {
      return;
    }

    console.log(`Navigating to workflow: ${workflowId}`);
    this.router.navigate([`/${workflowId}`]);
  }

  navigateToTool(toolId: string) {
    const tool = this.tools.find((item) => item.id === toolId);
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

  // Preconfid workflows
  workflows = [
    {
      id: "de-novo-design",
      label: "De Novo Design",
      href: "/de-novo-design",
    },
    {
      id: "motif-scaffolding",
      label: "Motif Scaffolding",
      href: "/motif-scaffolding",
      disabled: true,
    },
    {
      id: "partial-diffusion",
      label: "Partial Diffusion",
      href: "/partial-diffusion",
      disabled: true,
    },
  ];

  // Tools
  tools = [
    {
      id: "bindcraft",
      label: "BindCraft",
      href: "/de-novo-design",
    },
    {
      id: "rfdiffusion",
      label: "RFdiffusion",
      href: "/tools/rfdiffusion",
      disabled: true,
    },
    {
      id: "boltzgen",
      label: "BoltzGen",
      href: "/tools/boltzgen",
      disabled: true,
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
