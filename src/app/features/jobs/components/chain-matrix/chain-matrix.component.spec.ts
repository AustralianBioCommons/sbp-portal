import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChainMatrixComponent } from "./chain-matrix.component";
import {
  buildChainPairMatrix,
  parseChainPairScores,
} from "../../shared/prediction-results.utils";

const matrix = buildChainPairMatrix(
  parseChainPairScores("\t0\r\nA:B\t0.2000\r\nA:C\t0.8000\r\nB:C\t0.5000\r\n")
);

describe("ChainMatrixComponent", () => {
  let fixture: ComponentFixture<ChainMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChainMatrixComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChainMatrixComponent);
    fixture.componentRef.setInput("matrix", matrix);
    fixture.componentRef.setInput("metric", "ipSAE");
    fixture.detectChanges();
  });

  it("heads the corner cell with Chain and the axes with chain labels", () => {
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll("thead th:not([aria-hidden])")
    ).map((th) => (th as HTMLElement).textContent?.trim());

    expect(headers).toEqual(["Chain", "A", "B", "C"]);
  });

  it("pads every row to the container width", () => {
    const rows = fixture.nativeElement.querySelectorAll("tr");
    const padded = Array.from(rows).filter(
      (row) =>
        (row as HTMLElement).querySelector(":scope > [aria-hidden]") !== null
    );

    expect(padded.length).toBe(rows.length);
  });

  it("labels each row with its chain", () => {
    const rowHeaders = Array.from(
      fixture.nativeElement.querySelectorAll("tbody th")
    ).map((th) => (th as HTMLElement).textContent?.trim());

    expect(rowHeaders).toEqual(["A", "B", "C"]);
  });

  it("renders the row's values and an empty diagonal", () => {
    const firstRow = fixture.nativeElement.querySelectorAll("tbody tr")[0];
    const cells = Array.from(firstRow.querySelectorAll("td")).map((td) =>
      (td as HTMLElement).textContent?.trim()
    );

    // A vs A is blank; A vs B and A vs C carry the scores.
    expect(cells[0]).toContain("—");
    expect(cells[1]).toBe("0.200");
    expect(cells[2]).toBe("0.800");
  });

  it("names the metric in the heading and the caption", () => {
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain("ipSAE");

    const caption =
      fixture.nativeElement.querySelector("caption").textContent ?? "";
    expect(caption).toContain("row chain against column chain");
    expect(caption).not.toContain("symmetric");
  });
});
