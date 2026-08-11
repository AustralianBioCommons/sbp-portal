import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PaeMatrixComponent } from "./pae-matrix.component";
import { PaeMatrix, ResidueRef } from "../../shared/prediction-results.utils";

/** 4x4 matrix: chain A residues 1-2, chain B residues 5-6. */
const matrix: PaeMatrix = {
  size: 4,
  values: Float32Array.from([
    0, 1, 20, 22, 1, 0, 21, 23, 20, 21, 0, 2, 22, 23, 2, 0,
  ]),
  min: 0,
  max: 23,
};

const residues: ResidueRef[] = [
  { chain: "A", seq: 1 },
  { chain: "A", seq: 2 },
  { chain: "B", seq: 5 },
  { chain: "B", seq: 6 },
];

describe("PaeMatrixComponent", () => {
  let fixture: ComponentFixture<PaeMatrixComponent>;
  let component: PaeMatrixComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaeMatrixComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaeMatrixComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("matrix", matrix);
    fixture.componentRef.setInput("residues", residues);
    fixture.detectChanges();
  });

  it("creates", () => {
    expect(component).toBeTruthy();
  });

  it("summarises the whole matrix", () => {
    const stats = component.overallStats();

    expect(stats?.min).toBe(0);
    expect(stats?.max).toBe(23);
  });

  it("is interactive once residues cover the matrix", () => {
    expect(component.interactive()).toBeTrue();
  });

  it("is not interactive without a residue index", () => {
    fixture.componentRef.setInput("residues", []);
    fixture.detectChanges();

    expect(component.interactive()).toBeFalse();
  });

  it("flags a mismatch between the structure and the matrix", () => {
    fixture.componentRef.setInput("residues", residues.slice(0, 3));
    fixture.detectChanges();

    expect(component.countMismatch()).toBeTrue();
  });

  it("labels rows with the residue token", () => {
    expect(component.residueLabel(2)).toBe("B5");
  });

  it("reads the value at a cell", () => {
    expect(component.valueAt(0, 3)).toBe(22);
    expect(component.valueAt(9, 9)).toBeNull();
  });

  it("emits the residues covered by a keyboard selection", () => {
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    component.cursor.set({ row: 0, col: 2 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(emitted).toEqual([[0, 2]]);
  });

  it("extends the selection with shift and arrow keys", () => {
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    component.cursor.set({ row: 0, col: 0 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    component.onKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true })
    );

    expect(component.region()).toEqual({
      rowStart: 0,
      rowEnd: 0,
      colStart: 0,
      colEnd: 1,
    });
    expect(emitted[emitted.length - 1]).toEqual([0, 1]);
  });

  it("clamps the keyboard cursor to the matrix bounds", () => {
    component.cursor.set({ row: 0, col: 0 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    component.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowLeft" }));

    expect(component.cursor()).toEqual({ row: 0, col: 0 });

    component.onKeyDown(new KeyboardEvent("keydown", { key: "End" }));

    expect(component.cursor()).toEqual({ row: 3, col: 3 });
  });

  it("clears the selection on Escape", () => {
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    component.region.set({
      rowStart: 0,
      rowEnd: 1,
      colStart: 0,
      colEnd: 1,
    });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(component.region()).toBeNull();
    expect(emitted[emitted.length - 1]).toEqual([]);
  });

  it("keeps a local selection while the external highlight is still empty", () => {
    component.cursor.set({ row: 0, col: 1 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

    // The highlight only catches up after a round trip through the 3D viewer.
    fixture.detectChanges();

    expect(component.region()).toEqual({
      rowStart: 0,
      rowEnd: 0,
      colStart: 1,
      colEnd: 1,
    });
  });

  it("drops a stale region when the external highlight no longer covers it", () => {
    component.region.set({
      rowStart: 0,
      rowEnd: 1,
      colStart: 0,
      colEnd: 1,
    });
    fixture.componentRef.setInput("highlightedIndices", [3]);
    fixture.detectChanges();

    expect(component.region()).toBeNull();
  });

  it("keeps a region the external highlight still covers", () => {
    component.region.set({
      rowStart: 0,
      rowEnd: 0,
      colStart: 1,
      colEnd: 1,
    });
    fixture.componentRef.setInput("highlightedIndices", [0, 1]);
    fixture.detectChanges();

    expect(component.region()).not.toBeNull();
  });

  it("describes the matrix for assistive technology", () => {
    expect(component.surfaceLabel()).toContain("4 by 4 residues");
    expect(component.surfaceLabel()).toContain("Lower is more confident");
  });

  it("announces the cell under the cursor", () => {
    component.cursor.set({ row: 0, col: 2 });

    expect(component.announcement()).toBe(
      "A1 and B5, predicted aligned error 20.00 angstroms."
    );
  });

  /**
   * The element the ResizeObserver measures, found by role rather than by
   * counting parents so extra layout boxes cannot silently void these assertions.
   */
  const measuredColumn = (canvas: HTMLCanvasElement): HTMLElement => {
    const column = canvas.closest(".overflow-hidden");
    expect(column).not.toBeNull();
    return column as HTMLElement;
  };

  /** The draw waits on a ResizeObserver measurement, an effect, then a frame. */
  const waitForDraw = async (canvas: HTMLCanvasElement) => {
    for (let attempt = 0; attempt < 25 && !canvas.style.width; attempt++) {
      fixture.detectChanges();
      await new Promise(requestAnimationFrame);
    }
    expect(canvas.style.width).toBeTruthy();
  };

  it("sizes the canvas to fit its container, never wider", async () => {
    // The matrix arrives after the first render, so the wrapper does not exist
    // at startup and the observer has to attach when it appears.
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "320px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const column = measuredColumn(canvas);

    expect(canvas.offsetWidth).toBeGreaterThan(0);
    expect(canvas.offsetWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
  });

  it("centres the canvas within its column", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "900px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    // MAX_PLOT_SIDE caps the plot, so a wide column leaves slack either side.
    const column = measuredColumn(canvas);
    const slack = column.clientWidth - canvas.offsetWidth;
    expect(slack).toBeGreaterThan(0);
    expect(canvas.getBoundingClientRect().left).toBeCloseTo(
      column.getBoundingClientRect().left + slack / 2,
      0
    );
  });

  it("keeps the outermost x tick label inside the canvas without a right gutter", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "420px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const plot = component.plotRect();
    const padding = component.padding();
    expect(padding.right).toBe(0);

    // Nothing is painted beyond the plot's right edge, so no gutter is needed.
    const ratio = canvas.width / parseFloat(canvas.style.width);
    const ctx = canvas.getContext("2d")!;
    const strip = ctx.getImageData(
      Math.round((plot.left + plot.side - 1) * ratio),
      Math.round((plot.top + plot.side + 1) * ratio),
      Math.max(1, Math.round(2 * ratio)),
      Math.round(20 * ratio)
    ).data;

    let painted = 0;
    for (let i = 3; i < strip.length; i += 4) if (strip[i] !== 0) painted++;
    expect(painted).toBe(0);
  });

  it("rasterises the matrix with low PAE drawn darker than high PAE", async () => {
    const canvas: HTMLCanvasElement =
      fixture.nativeElement.querySelector("canvas");
    await waitForDraw(canvas);

    const ratio = canvas.width / parseFloat(canvas.style.width);
    const padding = component.padding();
    const side = component.plotRect().side;
    const cell = side / matrix.size;
    const ctx = canvas.getContext("2d")!;

    const sample = (row: number, col: number) =>
      ctx.getImageData(
        Math.round((padding.left + (col + 0.5) * cell) * ratio),
        Math.round((padding.top + (row + 0.5) * cell) * ratio),
        1,
        1
      ).data;

    const confident = sample(0, 0); // PAE 0
    const uncertain = sample(0, 3); // PAE 22

    const luminance = (px: Uint8ClampedArray) => px[0] + px[1] + px[2];
    expect(luminance(confident)).toBeLessThan(luminance(uncertain));
    expect(confident[3]).toBe(255);

    // PAE 0 is the dark end of the AlphaFold green ramp, #00441b.
    expect([confident[0], confident[1], confident[2]]).toEqual([0, 68, 27]);
    // High PAE is a pale green: bright, with green still the strongest channel.
    expect(uncertain[1]).toBeGreaterThan(200);
    expect(uncertain[1]).toBeGreaterThan(uncertain[0]);
    expect(uncertain[1]).toBeGreaterThan(uncertain[2]);
  });

  it("renders an error message instead of the plot", () => {
    fixture.componentRef.setInput("errorMessage", "Bad matrix");
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("Bad matrix");
  });
});
