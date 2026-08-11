import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroExclamationCircle } from "@ng-icons/heroicons/outline";
import { LoadingComponent } from "../../../../components/loading/loading.component";
import {
  ChainSegment,
  PaeMatrix,
  ResidueRef,
  buildChainSegments,
  formatResidueToken,
} from "../../shared/prediction-results.utils";

/** A rectangular block of the matrix: rows [rowStart, rowEnd] x cols [colStart, colEnd]. */
export interface PaeRegion {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

interface BlockStats {
  min: number;
  mean: number;
  max: number;
}

/** Fixed domain, so plots stay comparable between runs; higher values clamp. */
const PAE_DOMAIN_MAX = 30;

/**
 * Sequential green ramp anchored dark at PAE 0, as the AlphaFold database draws
 * it. Anchors for a 256-entry interpolation.
 */
const RAMP = [
  "#00441b",
  "#006d2c",
  "#238b45",
  "#41ab5d",
  "#74c476",
  "#a1d99b",
  "#c7e9c0",
  "#e5f5e0",
  "#f7fcf5",
];

/** Warm accent for selection, so it never reads as a value on the green ramp. */
const SELECTION_INK = "#eb6834";
/* text-gray-900 / text-gray-600 / border-gray-300, as hex rather than the
   theme's oklch() values because canvas oklch parsing is not universal. */
const AXIS_INK = "#101828";
const MUTED_INK = "#4a5565";
const GRID_INK = "#d1d5dc";
/** text-xs, with axis titles at font-medium (the 500 in the shorthand). */
const AXIS_TICK_FONT = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
const AXIS_TITLE_FONT =
  '500 12px system-ui, -apple-system, "Segoe UI", sans-serif';
const SURFACE = "#ffffff";

const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
/** Baseline of an axis title, measured back from the outer edge of its gutter. */
const AXIS_TITLE_GAP = 8;
/** Gap between a tick mark and its label, the same on both axes. */
const AXIS_LABEL_GAP = 6;
/** Length of a tick mark, drawn outward from the plot edge. */
const AXIS_TICK_LENGTH = 4;
/** Distance from the canvas edge to the rotated y-axis title. */
const AXIS_TITLE_INSET = 12;
const MIN_PLOT_SIDE = 140;
const MAX_PLOT_SIDE = 460;

@Component({
  selector: "app-pae-matrix",
  imports: [NgIconComponent, LoadingComponent],
  providers: [provideIcons({ heroExclamationCircle })],
  templateUrl: "./pae-matrix.component.html",
  styleUrl: "./pae-matrix.component.scss",
})
export class PaeMatrixComponent implements OnDestroy {
  matrix = input<PaeMatrix | null>(null);
  /** Ordered polymer residues; index i names row/column i of the matrix. */
  residues = input<readonly ResidueRef[]>([]);
  /** Residue indices selected in the 3D viewer, drawn as one box. */
  highlightedIndices = input<readonly number[]>([]);
  loading = input(false);
  errorMessage = input<string | null>(null);

  /** Emits the residue indices covered by a matrix selection (rows and columns). */
  selectionChange = output<number[]>();

  private static instanceCount = 0;
  private readonly uid = `pae-matrix-${++PaeMatrixComponent.instanceCount}`;
  readonly instructionsId = `${this.uid}-instructions`;

  private readonly canvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>("heatmap");
  private readonly wrapperRef = viewChild<ElementRef<HTMLElement>>("wrapper");

  /** Committed matrix selection, kept so the reader can see the block they chose. */
  readonly region = signal<PaeRegion | null>(null);
  /** Keyboard cursor cell; also set on pointer hover so both report the same value. */
  readonly cursor = signal<{ row: number; col: number } | null>(null);
  readonly tooltip = signal<{
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);

  /** Zero until the container is measured, so the first paint can never be wider
   *  than the space available. */
  private readonly plotSide = signal(0);
  /** Previous external highlight, so only real changes invalidate a local block. */
  private lastHighlight: ReadonlySet<number> | null = null;
  private drag: { row: number; col: number } | null = null;
  private baseImage: HTMLCanvasElement | null = null;
  private baseImageFor: PaeMatrix | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private observedWrapper: HTMLElement | null = null;
  private frame: number | null = null;

  readonly size = computed(() => this.matrix()?.size ?? 0);

  readonly chainSegments = computed<ChainSegment[]>(() =>
    buildChainSegments(this.residues())
  );

  /** Interaction needs a residue for every row, which requires the structure. */
  readonly interactive = computed(
    () => this.size() > 0 && this.residues().length >= this.size()
  );

  /** True when the structure and the matrix disagree on residue count. */
  readonly countMismatch = computed(() => {
    const residueCount = this.residues().length;
    return residueCount > 0 && this.size() > 0 && residueCount !== this.size();
  });

  readonly highlightSet = computed(() => new Set(this.highlightedIndices()));

  /** Extent of the 3D viewer's selection, drawn as a single box. */
  readonly highlightBounds = computed<PaeRegion | null>(() => {
    const size = this.size();
    const indices = this.highlightedIndices().filter(
      (index) => index >= 0 && index < size
    );
    if (indices.length === 0) return null;

    const min = Math.min(...indices);
    const max = Math.max(...indices);
    return { rowStart: min, rowEnd: max, colStart: min, colEnd: max };
  });

  readonly overallStats = computed<BlockStats | null>(() => {
    const matrix = this.matrix();
    if (!matrix) return null;
    return this.statsFor(matrix, {
      rowStart: 0,
      rowEnd: matrix.size - 1,
      colStart: 0,
      colEnd: matrix.size - 1,
    });
  });

  readonly tooltipValue = computed(() => {
    const tooltip = this.tooltip();
    return tooltip ? this.valueAt(tooltip.row, tooltip.col) : null;
  });

  /** Keeps the tooltip inside the plot by flipping it across the pointer. */
  readonly tooltipPlacement = computed(() => {
    const tooltip = this.tooltip();
    if (!tooltip) return null;
    const side = this.plotSide();
    const padding = this.padding();
    const flipX = tooltip.x > padding.left + side * 0.6;
    const flipY = tooltip.y > padding.top + side * 0.8;
    return {
      x: tooltip.x + (flipX ? -12 : 14),
      y: tooltip.y + (flipY ? -12 : 14),
      transform: `translate(${flipX ? "-100%" : "0"}, ${
        flipY ? "-100%" : "0"
      })`,
    };
  });

  readonly surfaceLabel = computed(() => {
    const stats = this.overallStats();
    const size = this.size();
    if (!stats || size === 0) return "Predicted aligned error matrix";
    return (
      `Predicted aligned error matrix, ${size} by ${size} residues. ` +
      `Values range from ${stats.min.toFixed(2)} to ${stats.max.toFixed(
        2
      )} angstroms, ` +
      `mean ${stats.mean.toFixed(2)}. Lower is more confident.`
    );
  });

  readonly announcement = computed(() => {
    const cursor = this.cursor();
    if (!cursor) return "";
    const value = this.valueAt(cursor.row, cursor.col);
    if (value === null) return "";
    return `${this.residueLabel(cursor.row)} and ${this.residueLabel(
      cursor.col
    )}, predicted aligned error ${value.toFixed(2)} angstroms.`;
  });

  /** Colour bar stops, mirroring the ramp used for the cells. */
  readonly legendGradient = `linear-gradient(to right, ${RAMP.join(", ")})`;
  readonly legendTicks = [0, 5, 10, 15, 20, 25, 30];

  constructor() {
    // The wrapper only exists once a matrix is present, so observe it when it
    // appears rather than once at startup.
    effect(() => {
      const wrapper = this.wrapperRef()?.nativeElement;
      untracked(() => this.observeResize(wrapper));
    });

    // Redraw whenever the data, the highlight, the selection or the size changes.
    effect(() => {
      this.matrix();
      this.residues();
      this.highlightSet();
      this.region();
      this.cursor();
      this.plotSide();
      this.canvasRef();
      this.scheduleDraw();
    });

    // A selection made elsewhere supersedes a stale local block. Only a real
    // change counts: the highlight lags a local drag by one round trip through
    // the 3D viewer, and must not wipe it meanwhile.
    effect(() => {
      const highlighted = this.highlightSet();
      const previous = this.lastHighlight;
      this.lastHighlight = highlighted;
      if (previous === null || sameSet(previous, highlighted)) return;

      const region = untracked(() => this.region());
      if (region && !this.regionCoveredBy(region, highlighted)) {
        this.region.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
  }

  // ── Pointer interaction ───────────────────────────────────────────────────

  onPointerDown(event: PointerEvent): void {
    if (!this.interactive()) return;
    const cell = this.cellAt(event);
    if (!cell) return;

    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    this.drag = cell;
    this.cursor.set(cell);
    this.region.set({
      rowStart: cell.row,
      rowEnd: cell.row,
      colStart: cell.col,
      colEnd: cell.col,
    });
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.interactive()) return;
    const cell = this.cellAt(event);
    if (!cell) {
      this.tooltip.set(null);
      return;
    }

    const padding = this.padding();
    this.tooltip.set({
      ...cell,
      x: event.offsetX + padding.left,
      y: event.offsetY + padding.top,
    });

    const drag = this.drag;
    if (!drag) return;

    this.cursor.set(cell);
    this.region.set({
      rowStart: Math.min(drag.row, cell.row),
      rowEnd: Math.max(drag.row, cell.row),
      colStart: Math.min(drag.col, cell.col),
      colEnd: Math.max(drag.col, cell.col),
    });
  }

  onPointerUp(): void {
    if (!this.drag) return;
    this.drag = null;
    this.emitRegionSelection();
  }

  onPointerLeave(): void {
    this.tooltip.set(null);
  }

  // ── Keyboard interaction ──────────────────────────────────────────────────

  onKeyDown(event: KeyboardEvent): void {
    const size = this.size();
    if (!this.interactive() || size === 0) return;

    if (event.key === "Escape") {
      event.preventDefault();
      this.clearSelection();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const cursor = this.cursor();
      if (!cursor) return;
      this.region.set({
        rowStart: cursor.row,
        rowEnd: cursor.row,
        colStart: cursor.col,
        colEnd: cursor.col,
      });
      this.emitRegionSelection();
      return;
    }

    const step = this.keyStep(event.key, size);
    if (!step) return;
    event.preventDefault();

    const cursor = this.cursor() ?? { row: 0, col: 0 };
    const next = {
      row: clamp(cursor.row + step.row, 0, size - 1),
      col: clamp(cursor.col + step.col, 0, size - 1),
    };
    this.cursor.set(next);

    if (event.shiftKey) {
      const region = this.region();
      const anchor = region
        ? { row: region.rowStart, col: region.colStart }
        : cursor;
      this.region.set({
        rowStart: Math.min(anchor.row, next.row),
        rowEnd: Math.max(anchor.row, next.row),
        colStart: Math.min(anchor.col, next.col),
        colEnd: Math.max(anchor.col, next.col),
      });
      this.emitRegionSelection();
    }
  }

  onBlur(): void {
    this.tooltip.set(null);
  }

  clearSelection(): void {
    this.region.set(null);
    this.selectionChange.emit([]);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  residueLabel(index: number): string {
    const residues = this.residues();
    const residue = residues[index];
    return residue ? formatResidueToken(residue) : `Residue ${index + 1}`;
  }

  valueAt(row: number, col: number): number | null {
    const matrix = this.matrix();
    if (!matrix) return null;
    if (row < 0 || col < 0 || row >= matrix.size || col >= matrix.size) {
      return null;
    }
    return matrix.values[row * matrix.size + col];
  }

  // ── Selection plumbing ────────────────────────────────────────────────────

  private emitRegionSelection(): void {
    const region = this.region();
    if (!region) return;

    const indices = new Set<number>();
    for (let row = region.rowStart; row <= region.rowEnd; row++) {
      indices.add(row);
    }
    for (let col = region.colStart; col <= region.colEnd; col++) {
      indices.add(col);
    }
    this.selectionChange.emit([...indices].sort((a, b) => a - b));
  }

  private regionCoveredBy(
    region: PaeRegion,
    highlighted: ReadonlySet<number>
  ): boolean {
    if (highlighted.size === 0) return false;
    for (let row = region.rowStart; row <= region.rowEnd; row++) {
      if (!highlighted.has(row)) return false;
    }
    for (let col = region.colStart; col <= region.colEnd; col++) {
      if (!highlighted.has(col)) return false;
    }
    return true;
  }

  private keyStep(
    key: string,
    size: number
  ): { row: number; col: number } | null {
    const page = Math.max(1, Math.round(size / 10));
    switch (key) {
      case "ArrowUp":
        return { row: -1, col: 0 };
      case "ArrowDown":
        return { row: 1, col: 0 };
      case "ArrowLeft":
        return { row: 0, col: -1 };
      case "ArrowRight":
        return { row: 0, col: 1 };
      case "PageUp":
        return { row: -page, col: 0 };
      case "PageDown":
        return { row: page, col: 0 };
      case "Home":
        return { row: -size, col: -size };
      case "End":
        return { row: size, col: size };
      default:
        return null;
    }
  }

  // ── Geometry ──────────────────────────────────────────────────────────────

  /** Axis gutters on a 12px grid, identical to the MSA coverage plot. */
  readonly padding = computed(() => ({
    left: 60,
    top: 12,
    right: 0,
    bottom: 48,
  }));

  /** Position of the interactive surface, so it covers the plot and nothing else. */
  readonly plotRect = computed(() => {
    const padding = this.padding();
    const side = this.plotSide();
    return { left: padding.left, top: padding.top, side };
  });

  /**
   * Cell under the pointer. The interactive surface is exactly the plot, so this
   * is in bounds by construction except while a drag is captured beyond the edge.
   */
  private cellAt(event: PointerEvent): { row: number; col: number } | null {
    const size = this.size();
    const side = this.plotSide();
    if (size === 0 || side <= 0) return null;

    const inside =
      event.offsetX >= 0 &&
      event.offsetY >= 0 &&
      event.offsetX < side &&
      event.offsetY < side;
    if (!inside && !this.drag) return null;

    return {
      row: clamp(Math.floor((event.offsetY / side) * size), 0, size - 1),
      col: clamp(Math.floor((event.offsetX / side) * size), 0, size - 1),
    };
  }

  private observeResize(wrapper: HTMLElement | undefined): void {
    if (wrapper === this.observedWrapper) return;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedWrapper = wrapper ?? null;
    if (!wrapper || typeof ResizeObserver === "undefined") return;

    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      // Not laid out yet; keep what we have rather than collapsing the plot.
      if (width <= 0) return;

      const padding = this.padding();
      // One pixel of slack, or sub-pixel widths round the canvas past its column.
      const side = clamp(
        Math.floor(width - padding.left - padding.right - 1),
        MIN_PLOT_SIDE,
        MAX_PLOT_SIDE
      );
      if (side !== this.plotSide()) this.plotSide.set(side);
      else this.scheduleDraw();
    });
    this.resizeObserver.observe(wrapper);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private scheduleDraw(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.draw();
    });
  }

  private draw(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const matrix = this.matrix();
    if (!canvas || !matrix) return;

    const padding = this.padding();
    const side = this.plotSide();
    if (side <= 0) return;
    const cssWidth = padding.left + side + padding.right;
    const cssHeight = padding.top + side + padding.bottom;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const base = this.ensureBaseImage(matrix);
    ctx.imageSmoothingEnabled = matrix.size > side;
    ctx.drawImage(
      base,
      0,
      0,
      matrix.size,
      matrix.size,
      padding.left,
      padding.top,
      side,
      side
    );

    this.drawChainSeparators(ctx, padding.left, padding.top, side, matrix.size);
    this.drawSelection(ctx, padding.left, padding.top, side, matrix.size);
    this.drawAxes(ctx, padding, side, matrix.size);
  }

  /** Rasterise the matrix once per dataset at one pixel per cell. */
  private ensureBaseImage(matrix: PaeMatrix): HTMLCanvasElement {
    if (this.baseImage && this.baseImageFor === matrix) return this.baseImage;

    const canvas = document.createElement("canvas");
    canvas.width = matrix.size;
    canvas.height = matrix.size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const image = ctx.createImageData(matrix.size, matrix.size);
      const lut = colourLut();
      for (let i = 0; i < matrix.values.length; i++) {
        const t = clamp(matrix.values[i] / PAE_DOMAIN_MAX, 0, 1);
        const stop = (Math.round(t * 255) | 0) * 3;
        const offset = i * 4;
        image.data[offset] = lut[stop];
        image.data[offset + 1] = lut[stop + 1];
        image.data[offset + 2] = lut[stop + 2];
        image.data[offset + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    }

    this.baseImage = canvas;
    this.baseImageFor = matrix;
    return canvas;
  }

  private drawChainSeparators(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    side: number,
    size: number
  ): void {
    const segments = this.chainSegments();
    if (segments.length < 2) return;

    ctx.save();
    ctx.strokeStyle = SURFACE;
    ctx.lineWidth = 1;
    for (const segment of segments.slice(1)) {
      const offset = (segment.start / size) * side;
      ctx.beginPath();
      ctx.moveTo(left + offset, top);
      ctx.lineTo(left + offset, top + side);
      ctx.moveTo(left, top + offset);
      ctx.lineTo(left + side, top + offset);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * One box, never more: a local drag draws its own block, otherwise the box is
   * the extent of what is selected in the 3D viewer.
   */
  private drawSelection(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    side: number,
    size: number
  ): void {
    const region = this.region() ?? this.highlightBounds();
    const cursor = this.cursor();
    const cell = side / size;

    if (region) {
      const x = left + region.colStart * cell;
      const y = top + region.rowStart * cell;
      const width = Math.max((region.colEnd - region.colStart + 1) * cell, 2);
      const height = Math.max((region.rowEnd - region.rowStart + 1) * cell, 2);
      ctx.save();
      ctx.strokeStyle = SELECTION_INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    }

    if (cursor && !region) {
      ctx.save();
      ctx.strokeStyle = SELECTION_INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        left + cursor.col * cell,
        top + cursor.row * cell,
        Math.max(cell, 4),
        Math.max(cell, 4)
      );
      ctx.restore();
    }
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    padding: { left: number; top: number; right: number; bottom: number },
    side: number,
    size: number
  ): void {
    const { left, top } = padding;

    ctx.save();
    ctx.strokeStyle = GRID_INK;
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, side - 1, side - 1);

    ctx.fillStyle = MUTED_INK;
    ctx.font = AXIS_TICK_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const step = tickStep(size);
    for (let index = 0; index < size; index += step) {
      const offset = ((index + 0.5) / size) * side;
      const label = this.tickLabel(index);

      ctx.beginPath();
      ctx.moveTo(left + offset, top + side);
      ctx.lineTo(left + offset, top + side + AXIS_TICK_LENGTH);
      ctx.stroke();
      drawXTickLabel(ctx, label, left + offset, top + side + AXIS_LABEL_GAP, {
        left,
        width: side,
      });

      ctx.beginPath();
      ctx.moveTo(left, top + offset);
      ctx.lineTo(left - AXIS_TICK_LENGTH, top + offset);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(label, left - AXIS_LABEL_GAP, top + offset);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
    }

    // Chains appear only as the separator lines inside the plot, no letters.
    ctx.fillStyle = AXIS_INK;
    ctx.font = AXIS_TITLE_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      "Scored residue",
      left + side / 2,
      top + side + padding.bottom - AXIS_TITLE_GAP
    );

    ctx.save();
    ctx.translate(AXIS_TITLE_INSET, top + side / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Aligned residue", 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private tickLabel(index: number): string {
    const residue = this.residues()[index];
    return residue ? String(residue.seq) : String(index + 1);
  }

  private statsFor(matrix: PaeMatrix, region: PaeRegion): BlockStats | null {
    const rowStart = clamp(region.rowStart, 0, matrix.size - 1);
    const rowEnd = clamp(region.rowEnd, 0, matrix.size - 1);
    const colStart = clamp(region.colStart, 0, matrix.size - 1);
    const colEnd = clamp(region.colEnd, 0, matrix.size - 1);

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let total = 0;
    let count = 0;

    for (let row = rowStart; row <= rowEnd; row++) {
      const offset = row * matrix.size;
      for (let col = colStart; col <= colEnd; col++) {
        const value = matrix.values[offset + col];
        if (value < min) min = value;
        if (value > max) max = value;
        total += value;
        count++;
      }
    }

    return count === 0 ? null : { min, mean: total / count, max };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sameSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

/**
 * Draw an x-axis tick label centred on its tick, right-aligning the outermost one
 * instead of overhanging the plot — otherwise the plot needs a right-hand gutter
 * to hold one label's overhang.
 */
function drawXTickLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  plot: { left: number; width: number }
): void {
  const right = plot.left + plot.width;
  const overflows = x + ctx.measureText(label).width / 2 > right;

  ctx.textAlign = overflows ? "right" : "center";
  ctx.fillText(label, overflows ? right : x, y);
  ctx.textAlign = "center";
}

function tickStep(size: number): number {
  const target = Math.max(1, Math.floor(size / 8));
  return TICK_STEPS.find((step) => step >= target) ?? size;
}

let cachedLut: Uint8Array | null = null;

function colourLut(): Uint8Array {
  if (cachedLut) return cachedLut;

  const anchors = RAMP.map(hexToRgb);
  const lut = new Uint8Array(256 * 3);
  const spans = anchors.length - 1;

  for (let i = 0; i < 256; i++) {
    const position = (i / 255) * spans;
    const index = Math.min(Math.floor(position), spans - 1);
    const t = position - index;
    const from = anchors[index];
    const to = anchors[index + 1];
    lut[i * 3] = Math.round(from[0] + (to[0] - from[0]) * t);
    lut[i * 3 + 1] = Math.round(from[1] + (to[1] - from[1]) * t);
    lut[i * 3 + 2] = Math.round(from[2] + (to[2] - from[2]) * t);
  }

  cachedLut = lut;
  return lut;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
