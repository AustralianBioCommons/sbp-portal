import { Component, input, ChangeDetectionStrategy } from "@angular/core";
import { ChainPairMatrix } from "../../shared/prediction-results.utils";

@Component({
  selector: "app-chain-matrix",
  templateUrl: "./chain-matrix.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: "./chain-matrix.component.scss",
})
export class ChainMatrixComponent {
  matrix = input.required<ChainPairMatrix>();
  metric = input.required<string>();
  precision = input(3);
}
