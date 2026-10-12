import { Component, ChangeDetectionStrategy } from "@angular/core";
import { WorkflowPapersComponent } from "../../../components/workflow-papers/workflow-papers.component";

/** Papers tab content for the De Novo Design workflow. */
@Component({
  selector: "app-de-novo-design-papers",
  imports: [WorkflowPapersComponent],
  templateUrl: "./de-novo-design-papers.component.html",
  styleUrl: "./de-novo-design-papers.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DeNovoDesignPapersComponent {}
