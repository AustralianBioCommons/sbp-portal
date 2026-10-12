import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
} from "@angular/core";

/** Hexes from Mol*'s plddt-confidence theme. */
const PLDDT_BANDS = [
  { label: "Very high", range: "pLDDT > 90", color: "#0053d6" },
  { label: "High", range: "90 ≥ pLDDT > 70", color: "#65cbf3" },
  { label: "Low", range: "70 ≥ pLDDT > 50", color: "#ffdb13" },
  { label: "Very low", range: "pLDDT ≤ 50", color: "#ff7d45" },
] as const;

type PlddtConfidenceLevel = (typeof PLDDT_BANDS)[number]["label"];

@Component({
  selector: "app-plddt-legend",
  templateUrl: "./plddt-legend.component.html",
  styleUrl: "./plddt-legend.component.scss",
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: "block" },
})
export class PlddtLegendComponent {
  /** Select one band for a score table, or show all bands for a viewer. */
  readonly confidence = input<PlddtConfidenceLevel>();

  readonly bands = computed(() => {
    const confidence = this.confidence();
    return confidence
      ? PLDDT_BANDS.filter((band) => band.label === confidence)
      : PLDDT_BANDS;
  });
}
