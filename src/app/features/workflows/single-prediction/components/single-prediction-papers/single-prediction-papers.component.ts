import { Component, ChangeDetectionStrategy } from "@angular/core";
import { WorkflowPapersComponent } from "../../../components/workflow-papers/workflow-papers.component";

/** Papers tab content for the Single Prediction workflow. */
@Component({
  selector: "app-single-prediction-papers",
  imports: [WorkflowPapersComponent],
  templateUrl: "./single-prediction-papers.component.html",
  styleUrl: "./single-prediction-papers.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SinglePredictionPapersComponent {}
