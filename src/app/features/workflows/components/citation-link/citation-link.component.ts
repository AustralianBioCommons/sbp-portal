import {
  Component,
  computed,
  input,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  CitationKey,
  formatCitationLinkLabel,
  getCitationHref,
  getCitation,
} from "../../../citations/workflow-citations";

/** Inline citation link rendered as "FirstAuthor, Year". */
@Component({
  selector: "app-citation-link",
  templateUrl: "./citation-link.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "contents" },
})
export class CitationLinkComponent {
  readonly citationKey = input.required<CitationKey | string>();

  protected readonly citation = computed(() => getCitation(this.citationKey()));
  protected readonly href = computed(() => {
    const citation = this.citation();
    return citation ? getCitationHref(citation) : "";
  });
  protected readonly label = computed(() => {
    const citation = this.citation();
    return citation ? formatCitationLinkLabel(citation) : this.citationKey();
  });
}
