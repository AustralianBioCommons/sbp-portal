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
    expect(component.interactive()).toBeFalse();
  });

  it("is not interactive with more residues than the matrix has rows", () => {
    // A spare residue offsets every index after it.
    fixture.componentRef.setInput("residues", [
      ...residues,
      { chain: "B", seq: 7 },
    ]);
    fixture.detectChanges();

    expect(component.countMismatch()).toBeTrue();
    expect(component.interactive()).toBeFalse();
  });

  it("labels rows with the residue token", () => {
    expect(component.residueLabel(2)).toBe("B5");
  });

  it("labels a ligand's rows by atom, since they share one residue number", () => {
    fixture.componentRef.setInput("residues", [
      { chain: "A", seq: 1 },
      { chain: "A", seq: 2 },
      { chain: "B", seq: 1, atom: "PA" },
      { chain: "B", seq: 1, atom: "O1A" },
    ]);
    fixture.detectChanges();

    expect(component.residueLabel(1)).toBe("A2");
    expect(component.residueLabel(2)).toBe("B:PA");
    expect(component.residueLabel(3)).toBe("B:O1A");
    expect(component.interactive()).toBeTrue();
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

  it("collapses a shift selection back to the cell it started from", () => {
    const shift = (key: string) =>
      component.onKeyDown(
        new KeyboardEvent("keydown", { key, shiftKey: true })
      );

    component.cursor.set({ row: 0, col: 2 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

    shift("ArrowLeft");
    expect(component.region()).toEqual({
      rowStart: 0,
      rowEnd: 0,
      colStart: 1,
      colEnd: 2,
    });

    // The anchor stays at column 2, so coming back collapses onto it.
    shift("ArrowRight");
    expect(component.region()).toEqual({
      rowStart: 0,
      rowEnd: 0,
      colStart: 2,
      colEnd: 2,
    });
  });

  it("extends across the anchor rather than dragging it along", () => {
    const shift = (key: string) =>
      component.onKeyDown(
        new KeyboardEvent("keydown", { key, shiftKey: true })
      );

    component.cursor.set({ row: 2, col: 2 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

    shift("ArrowUp");
    shift("ArrowUp");
    shift("ArrowDown");
    shift("ArrowDown");
    shift("ArrowDown");

    expect(component.region()).toEqual({
      rowStart: 2,
      rowEnd: 3,
      colStart: 2,
      colEnd: 2,
    });
  });

  it("re-anchors after the cursor moves without shift", () => {
    component.cursor.set({ row: 0, col: 0 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    component.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    component.onKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true })
    );

    expect(component.region()).toEqual({
      rowStart: 1,
      rowEnd: 1,
      colStart: 0,
      colEnd: 1,
    });
  });

  it("re-anchors after Escape clears the selection", () => {
    component.cursor.set({ row: 0, col: 0 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    component.onKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true })
    );
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));

    // The cursor is at 0,1 after the extend, so the fresh anchor sits there.
    component.onKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true })
    );

    expect(component.region()).toEqual({
      rowStart: 0,
      rowEnd: 1,
      colStart: 1,
      colEnd: 1,
    });
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
    expect(component.surfaceLabel()).toContain("4 by 4 positions");
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

  /** `target` is a stub: setPointerCapture rejects an untracked pointer id. */
  const pointerAt = (type: string, x: number, y: number): PointerEvent => {
    const event = new PointerEvent(type, { pointerId: 1 });
    Object.defineProperties(event, {
      offsetX: { value: x },
      offsetY: { value: y },
      target: { value: { setPointerCapture: () => undefined } },
    });
    return event;
  };

  /** Centre of a cell, in surface coordinates. */
  const cellCentre = (row: number, col: number) => {
    const cell = component.plotRect().side / matrix.size;
    return { x: (col + 0.5) * cell, y: (row + 0.5) * cell };
  };

  const readyCanvas = async (width = "420px") => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = width;
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);
    return canvas;
  };

  it("emits the residues covered by a pointer drag", async () => {
    await readyCanvas();
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    const from = cellCentre(0, 0);
    const to = cellCentre(2, 1);
    component.onPointerDown(pointerAt("pointerdown", from.x, from.y));
    component.onPointerMove(pointerAt("pointermove", to.x, to.y));
    component.onPointerUp();

    expect(component.region()).toEqual({
      rowStart: 0,
      rowEnd: 2,
      colStart: 0,
      colEnd: 1,
    });
    expect(emitted).toEqual([[0, 1, 2]]);
  });

  it("normalises a drag made upwards and to the left", async () => {
    await readyCanvas();
    const from = cellCentre(3, 3);
    const to = cellCentre(1, 2);

    component.onPointerDown(pointerAt("pointerdown", from.x, from.y));
    component.onPointerMove(pointerAt("pointermove", to.x, to.y));
    component.onPointerUp();

    expect(component.region()).toEqual({
      rowStart: 1,
      rowEnd: 3,
      colStart: 2,
      colEnd: 3,
    });
  });

  it("clamps a drag that runs past the edge of the plot", async () => {
    await readyCanvas();
    const from = cellCentre(1, 1);
    const side = component.plotRect().side;

    component.onPointerDown(pointerAt("pointerdown", from.x, from.y));
    component.onPointerMove(pointerAt("pointermove", side * 2, side * 2));
    component.onPointerUp();

    expect(component.region()).toEqual({
      rowStart: 1,
      rowEnd: 3,
      colStart: 1,
      colEnd: 3,
    });
  });

  const clearHandle = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('button[aria-label="Clear selection"]');

  /** Drag from one cell to another and release like a real selection */
  const dragBlock = async (
    from: { row: number; col: number },
    to: { row: number; col: number }
  ) => {
    const start = cellCentre(from.row, from.col);
    const end = cellCentre(to.row, to.col);
    component.onPointerDown(pointerAt("pointerdown", start.x, start.y));
    component.onPointerMove(pointerAt("pointermove", end.x, end.y));
    component.onPointerUp();
    fixture.detectChanges();
  };

  it("clears the selection from the handle on the block", async () => {
    await readyCanvas();
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    await dragBlock({ row: 0, col: 0 }, { row: 2, col: 2 });

    clearHandle()!.click();
    fixture.detectChanges();

    expect(component.region()).toBeNull();
    expect(emitted[emitted.length - 1]).toEqual([]);
    expect(clearHandle()).toBeNull();
  });

  it("offers no clear handle until something is selected", async () => {
    await readyCanvas();

    expect(clearHandle()).toBeNull();
    expect(component.selectionHandle()).toBeNull();
  });

  it("withholds the handle mid-drag", async () => {
    await readyCanvas();
    const start = cellCentre(0, 0);
    const end = cellCentre(2, 2);

    component.onPointerDown(pointerAt("pointerdown", start.x, start.y));
    component.onPointerMove(pointerAt("pointermove", end.x, end.y));
    fixture.detectChanges();
    expect(clearHandle()).toBeNull();

    component.onPointerUp();
    fixture.detectChanges();
    expect(clearHandle()).not.toBeNull();
  });

  it("does not select on a click that never moves", async () => {
    await readyCanvas();
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));
    const at = cellCentre(1, 1);

    component.onPointerDown(pointerAt("pointerdown", at.x, at.y));
    component.onPointerMove(pointerAt("pointermove", at.x, at.y));
    component.onPointerUp();
    fixture.detectChanges();

    expect(component.region()).toBeNull();
    expect(emitted).toEqual([]);
    expect(clearHandle()).toBeNull();
  });

  it("leaves an existing block alone when clicked without dragging", async () => {
    await readyCanvas();
    await dragBlock({ row: 0, col: 0 }, { row: 2, col: 2 });
    const selected = component.region();

    const at = cellCentre(3, 3);
    component.onPointerDown(pointerAt("pointerdown", at.x, at.y));
    component.onPointerUp();
    fixture.detectChanges();

    expect(component.region()).toEqual(selected);
  });

  it("sits the handle on the block's top-right corner", async () => {
    await readyCanvas();
    const padding = component.padding();
    const cell = component.plotRect().side / matrix.size;

    component.region.set({ rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 2 });

    expect(component.selectionHandle()).toEqual({
      x: padding.left + 3 * cell,
      y: padding.top + cell,
    });
  });

  it("keeps the handle over the plot for a block on the edge", async () => {
    await readyCanvas();
    const padding = component.padding();
    const side = component.plotRect().side;

    component.region.set({ rowStart: 0, rowEnd: 1, colStart: 2, colEnd: 3 });
    const handle = component.selectionHandle()!;

    expect(handle.x).toBeLessThan(padding.left + side);
    expect(handle.y).toBeGreaterThan(padding.top);
  });

  it("tracks the pointer without selecting until a drag starts", async () => {
    await readyCanvas();
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    const at = cellCentre(2, 3);
    component.onPointerMove(pointerAt("pointermove", at.x, at.y));

    expect(component.tooltip()).toEqual(
      jasmine.objectContaining({ row: 2, col: 3 })
    );
    expect(component.region()).toBeNull();
    expect(emitted).toEqual([]);
  });

  it("drops the tooltip when the pointer leaves the plot", async () => {
    await readyCanvas();
    const at = cellCentre(1, 1);
    component.onPointerMove(pointerAt("pointermove", at.x, at.y));
    expect(component.tooltip()).not.toBeNull();

    component.onPointerLeave();
    expect(component.tooltip()).toBeNull();

    component.onPointerMove(pointerAt("pointermove", at.x, at.y));
    component.onBlur();
    expect(component.tooltip()).toBeNull();
  });

  it("ignores a pointer outside the plot", async () => {
    await readyCanvas();
    component.onPointerMove(pointerAt("pointermove", -5, -5));

    expect(component.tooltip()).toBeNull();
    expect(component.region()).toBeNull();
  });

  it("ignores pointer input without a residue index", async () => {
    await readyCanvas();
    fixture.componentRef.setInput("residues", []);
    fixture.detectChanges();

    component.onPointerDown(pointerAt("pointerdown", 10, 10));
    component.onPointerMove(pointerAt("pointermove", 20, 20));

    expect(component.region()).toBeNull();
    expect(component.tooltip()).toBeNull();
  });

  it("ignores input when a spare residue offsets the index", async () => {
    await readyCanvas();
    fixture.componentRef.setInput("residues", [
      ...residues,
      { chain: "B", seq: 7 },
    ]);
    fixture.detectChanges();

    const at = cellCentre(1, 1);
    component.onPointerDown(pointerAt("pointerdown", at.x, at.y));
    component.onPointerMove(pointerAt("pointermove", at.x, at.y));
    component.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));

    expect(component.region()).toBeNull();
    expect(component.tooltip()).toBeNull();
    expect(component.cursor()).toBeNull();
  });

  it("flips the tooltip back across the pointer near the far edges", async () => {
    await readyCanvas();
    const padding = component.padding();
    const side = component.plotRect().side;

    component.tooltip.set({
      row: 0,
      col: 0,
      x: padding.left + 4,
      y: padding.top + 4,
    });
    const near = component.tooltipPlacement()!;
    expect(near.transform).toBe("translate(0, 0)");

    component.tooltip.set({
      row: 3,
      col: 3,
      x: padding.left + side,
      y: padding.top + side,
    });
    const far = component.tooltipPlacement()!;
    expect(far.transform).toBe("translate(-100%, -100%)");
    expect(far.x).toBeLessThan(padding.left + side);
  });

  it("has no tooltip placement without a tooltip", () => {
    expect(component.tooltipPlacement()).toBeNull();
  });

  it("spans the 3D viewer's selection with a single box", () => {
    fixture.componentRef.setInput("highlightedIndices", [1, 3, 99]);
    fixture.detectChanges();

    expect(component.highlightBounds()).toEqual({
      rowStart: 1,
      rowEnd: 3,
      colStart: 1,
      colEnd: 3,
    });

    fixture.componentRef.setInput("highlightedIndices", [99]);
    fixture.detectChanges();
    expect(component.highlightBounds()).toBeNull();
  });

  it("outlines the external highlight on the canvas", async () => {
    fixture.componentRef.setInput("highlightedIndices", [0, 1]);
    const canvas = await readyCanvas();

    const ratio = canvas.width / parseFloat(canvas.style.width);
    const padding = component.padding();
    const side = component.plotRect().side;
    const cell = side / matrix.size;
    const ctx = canvas.getContext("2d")!;

    // Scan the box's lower edge for the selection ink, rather than assuming
    // where the 2px stroke lands relative to the path.
    const band = ctx.getImageData(
      Math.round(padding.left * ratio),
      Math.round((padding.top + 2 * cell - 1) * ratio),
      Math.round(side * ratio),
      Math.max(1, Math.round(3 * ratio))
    ).data;

    let inkPixels = 0;
    for (let i = 0; i < band.length; i += 4) {
      const [r, g, b] = [band[i], band[i + 1], band[i + 2]];
      if (r > 200 && r > g && g > b) inkPixels++;
    }

    expect(inkPixels).toBeGreaterThan(0);
  });

  it("moves the cursor by a page and to the start", () => {
    component.cursor.set({ row: 0, col: 0 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "PageDown" }));
    expect(component.cursor()?.row).toBeGreaterThan(0);

    component.onKeyDown(new KeyboardEvent("keydown", { key: "PageUp" }));
    expect(component.cursor()).toEqual({ row: 0, col: 0 });

    component.onKeyDown(new KeyboardEvent("keydown", { key: "End" }));
    component.onKeyDown(new KeyboardEvent("keydown", { key: "Home" }));
    expect(component.cursor()).toEqual({ row: 0, col: 0 });
  });

  it("ignores keys it does not handle", () => {
    component.cursor.set({ row: 1, col: 1 });
    component.onKeyDown(new KeyboardEvent("keydown", { key: "a" }));

    expect(component.cursor()).toEqual({ row: 1, col: 1 });
  });

  it("ignores keyboard input without a residue index", () => {
    fixture.componentRef.setInput("residues", []);
    fixture.detectChanges();

    component.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));

    expect(component.cursor()).toBeNull();
  });

  it("commits nothing on Enter without a cursor", () => {
    const emitted: number[][] = [];
    component.selectionChange.subscribe((indices) => emitted.push(indices));

    component.onKeyDown(new KeyboardEvent("keydown", { key: " " }));

    expect(emitted).toEqual([]);
  });

  it("keeps the plot at its capped size as the container grows", async () => {
    const canvas = await readyCanvas("900px");
    const capped = component.plotRect().side;

    fixture.nativeElement.style.width = "1400px";
    for (let attempt = 0; attempt < 10; attempt++) {
      fixture.detectChanges();
      await new Promise(requestAnimationFrame);
    }

    expect(component.plotRect().side).toBe(capped);
    expect(canvas.style.width).toBeTruthy();
  });

  it("keeps the last measurement when the container collapses", async () => {
    await readyCanvas();
    const measured = component.plotRect().side;

    fixture.nativeElement.style.width = "0px";
    for (let attempt = 0; attempt < 10; attempt++) {
      fixture.detectChanges();
      await new Promise(requestAnimationFrame);
    }

    expect(component.plotRect().side).toBe(measured);
  });

  it("reports the value under the tooltip", () => {
    expect(component.tooltipValue()).toBeNull();

    component.tooltip.set({ row: 0, col: 3, x: 0, y: 0 });
    expect(component.tooltipValue()).toBe(22);
  });

  it("starts the keyboard cursor at the first cell", () => {
    component.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));

    expect(component.cursor()).toEqual({ row: 1, col: 0 });
  });

  it("anchors a shift-extended selection on the cursor when nothing is selected", () => {
    component.cursor.set({ row: 2, col: 2 });
    component.onKeyDown(
      new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true })
    );

    expect(component.region()).toEqual({
      rowStart: 2,
      rowEnd: 3,
      colStart: 2,
      colEnd: 2,
    });
  });

  it("falls back to a positional label outside the residue index", () => {
    expect(component.residueLabel(9)).toBe("Residue 10");
  });

  it("has nothing to describe without a matrix", () => {
    fixture.componentRef.setInput("matrix", null);
    fixture.detectChanges();

    expect(component.size()).toBe(0);
    expect(component.overallStats()).toBeNull();
    expect(component.surfaceLabel()).toBe("Predicted aligned error matrix");
    expect(component.valueAt(0, 0)).toBeNull();

    component.cursor.set({ row: 0, col: 0 });
    expect(component.announcement()).toBe("");
  });

  it("keeps a region across a highlight change that still covers it", () => {
    const region = { rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 0 };
    component.region.set(region);

    // Same size, different membership — both still cover cell 0,0.
    fixture.componentRef.setInput("highlightedIndices", [0, 1]);
    fixture.detectChanges();
    fixture.componentRef.setInput("highlightedIndices", [0, 2]);
    fixture.detectChanges();

    expect(component.region()).toEqual(region);
  });

  it("draws no chain separators for a single-chain matrix", async () => {
    fixture.componentRef.setInput(
      "residues",
      residues.map((residue) => ({ ...residue, chain: "A" }))
    );
    const canvas = await readyCanvas();

    expect(component.chainSegments().length).toBe(1);
    expect(canvas.style.width).toBeTruthy();
  });

  it("outlines the keyboard cursor when nothing is selected", async () => {
    const canvas = await readyCanvas();
    component.onFocus();
    component.cursor.set({ row: 1, col: 1 });
    component.region.set(null);
    for (let attempt = 0; attempt < 5; attempt++) {
      fixture.detectChanges();
      await new Promise(requestAnimationFrame);
    }

    const ratio = canvas.width / parseFloat(canvas.style.width);
    const padding = component.padding();
    const cell = component.plotRect().side / matrix.size;
    const ctx = canvas.getContext("2d")!;

    const band = ctx.getImageData(
      Math.round((padding.left + cell) * ratio),
      Math.round((padding.top + cell - 1) * ratio),
      Math.max(1, Math.round(cell * ratio)),
      Math.max(1, Math.round(3 * ratio))
    ).data;

    let inkPixels = 0;
    for (let i = 0; i < band.length; i += 4) {
      const [r, g, b] = [band[i], band[i + 1], band[i + 2]];
      if (r > 200 && r > g && g > b) inkPixels++;
    }

    expect(inkPixels).toBeGreaterThan(0);
  });

  describe("axis ticks", () => {
    const chain = (start: number, count = 301): ResidueRef[] =>
      Array.from({ length: count }, (_, i) => ({ chain: "A", seq: start + i }));

    const sized = (size: number): PaeMatrix => ({
      size,
      values: new Float32Array(size * size),
      min: 0,
      max: 0,
    });

    function labels(residues: ResidueRef[]): string[] {
      fixture.componentRef.setInput("matrix", sized(residues.length));
      fixture.componentRef.setInput("residues", residues);
      fixture.detectChanges();
      return component.axisTicks().map((tick) => tick.label);
    }

    it("labels a single chain with its own residue numbers", () => {
      expect(labels(chain(20))).toEqual([
        "20",
        "50",
        "100",
        "150",
        "200",
        "250",
        "300",
      ]);
      expect(component.numberByResidue()).toBeTrue();
    });

    it("drops the origin mark when a round one is within half a step", () => {
      expect(labels(chain(45))[0]).toBe("50");
    });

    it("counts positions once a second chain restarts the numbering", () => {
      const twoChains = [
        ...chain(1, 200),
        ...Array.from({ length: 101 }, (_, i) => ({ chain: "B", seq: 1 + i })),
      ];

      expect(labels(twoChains)).toEqual([
        "1",
        "50",
        "100",
        "150",
        "200",
        "250",
        "300",
      ]);
      expect(component.numberByResidue()).toBeFalse();
    });

    it("counts positions when a ligand contributes one entry per atom", () => {
      const withLigand = [
        ...chain(1, 300),
        { chain: "B", seq: 1, atom: "C1B" },
      ];

      expect(component.numberByResidue()).toBeFalse();
      expect(labels(withLigand)[0]).toBe("1");
    });

    it("counts positions for a single chain of ligand atoms", () => {
      const atomsOnly = Array.from({ length: 301 }, (_, i) => ({
        chain: "A",
        seq: 1,
        atom: `C${i + 1}`,
      }));

      expect(labels(atomsOnly)).toEqual([
        "1",
        "50",
        "100",
        "150",
        "200",
        "250",
        "300",
      ]);
      expect(component.numberByResidue()).toBeFalse();
    });
  });
});
