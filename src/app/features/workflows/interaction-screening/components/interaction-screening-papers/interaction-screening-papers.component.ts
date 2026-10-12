import { Component, ChangeDetectionStrategy } from "@angular/core";
import { WorkflowPapersComponent } from "../../../components/workflow-papers/workflow-papers.component";

/** Papers tab content for the Interaction Screening workflow. */
@Component({
  selector: "app-interaction-screening-papers",
  imports: [WorkflowPapersComponent],
  templateUrl: "./interaction-screening-papers.component.html",
  styleUrl: "./interaction-screening-papers.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class InteractionScreeningPapersComponent {}
