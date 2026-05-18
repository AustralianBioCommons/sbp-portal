import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { ButtonComponent } from "../../components/button/button.component";
import { THEMES } from "../../cores/config/themes.config";

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

    this.router.navigate([`/${workflowId}`]);
  }

  navigateToTool(toolId: string) {
    const tool = this.tools.find((item) => item.id === toolId);
    if (!tool || tool.disabled) {
      return;
    }

    this.router.navigateByUrl(tool.href);
  }

  private readonly theme = THEMES.find((t) => t.id === "structure-prediction")!;
  workflows = this.theme.workflows;
  tools = this.theme.tools;
}
