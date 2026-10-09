import {
  Component,
  computed,
  input,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  CitationKey,
  formatCitation,
  getCitations,
  getCitationHref,
  getRelevantCitations,
} from "../../../citations/workflow-citations";

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
  /** Citation keys to render instead of automatic workflow/tool lookup. */
  readonly citations = input<readonly (CitationKey | string)[] | null>(null);
  /** Optional tools to cite in addition to workflow-level citations. */
  readonly tools = input<readonly string[]>([]);

  readonly resolvedCitations = computed(() => {
    const citations = this.citations();
    if (citations !== null) {
      return getCitations(citations);
    }

    return getRelevantCitations({
      workflow: this.workflowName(),
      tools: this.tools(),
    });
  });

  protected formatCitation = formatCitation;
  protected getCitationHref = getCitationHref;
}
