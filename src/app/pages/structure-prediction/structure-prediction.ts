import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { ButtonComponent } from "../../components/button/button.component";

@Component({
  selector: "app-structure-prediction",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: "./structure-prediction.html",
})
export class StructurePredictionComponent {
  private router = inject(Router);

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
    this.router.navigate(["/tools", toolId]);
  }

  workflows = [
    {
      id: "single-structure-prediction",
      label: "Single Prediction",
      href: "/single-structure-prediction",
      disabled: true,
    },
    {
      id: "interaction-screening",
      label: "Interaction Screening",
      href: "/interaction-screening",
      disabled: true,
    },
  ];

  tools = [
    {
      id: "boltz",
      label: "Boltz",
      href: "/tools/boltz",
      disabled: true,
    },
    {
      id: "colabfold",
      label: "ColabFold",
      href: "/tools/colabfold",
      disabled: true,
    },
    {
      id: "alphafold2",
      label: "AlphaFold2",
      href: "/tools/alphafold2",
      disabled: true,
    },
  ];
}
