import { Component, ChangeDetectionStrategy } from "@angular/core";
import { WorkflowPapersComponent } from "../../../components/workflow-papers/workflow-papers.component";

/** Papers tab content for the Bulk Prediction workflow. */
@Component({
  selector: "app-bulk-prediction-papers",
  imports: [WorkflowPapersComponent],
  templateUrl: "./bulk-prediction-papers.component.html",
  styleUrl: "./bulk-prediction-papers.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BulkPredictionPapersComponent {}
