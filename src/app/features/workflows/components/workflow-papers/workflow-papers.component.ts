import {
  Component,
  computed,
  input,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CitedTool, getToolCitations } from "../../shared/workflow-citations";

/** Papers tab content: how to cite each tool a structure prediction workflow offers. */
@Component({
  selector: "app-workflow-papers",
  templateUrl: "./workflow-papers.component.html",
  styleUrl: "./workflow-papers.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block space-y-4 pt-4 text-sm text-gray-500" },
})
export class WorkflowPapersComponent {
  /** Name used in the intro sentence. */
  readonly workflowName = input.required<string>();
  /** Tools to cite, in display order. */
  readonly tools = input.required<readonly CitedTool[]>();

  readonly citations = computed(() => getToolCitations(this.tools()));
}
