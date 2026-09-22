import { Component } from "@angular/core";

@Component({
  selector: "app-plddt-legend",
  templateUrl: "./plddt-legend.component.html",
  styleUrl: "./plddt-legend.component.scss",
  host: { class: "block" },
})
export class PlddtLegendComponent {
  /** Hexes from Mol*'s plddt-confidence theme. */
  readonly bands = [
    { label: "Very high", range: "pLDDT > 90", color: "#0053d6" },
    { label: "High", range: "90 > pLDDT > 70", color: "#65cbf3" },
    { label: "Low", range: "70 > pLDDT > 50", color: "#ffdb13" },
    { label: "Very low", range: "pLDDT < 50", color: "#ff7d45" },
  ];
}
