import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroExclamationCircle } from "@ng-icons/heroicons/outline";
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { MsaCoverage } from "../../shared/prediction-results.utils";

const DEPTH_INK = "#0b0b0b";
/* Tailwind grays as hex; canvas oklch parsing is not universal. */
const AXIS_INK = "#101828";
const MUTED_INK = "#4a5565";
const GRID_INK = "#d1d5dc";
const AXIS_TICK_FONT = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
const AXIS_TITLE_FONT =
  '500 12px system-ui, -apple-system, "Segoe UI", sans-serif';
const SURFACE = "#ffffff";

/** Axis gutters on a 12px grid, identical to the PAE matrix. */
const PADDING = { left: 60, top: 0, right: 0, bottom: 48 };
const PLOT_HEIGHT = 340;
const MIN_PLOT_WIDTH = 140;
const MAX_PLOT_WIDTH = 900;
const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
/** Axis title baseline, measured back from the outer edge of its gutter. */
const AXIS_TITLE_GAP = 8;
const AXIS_LABEL_GAP = 6;
const AXIS_TICK_LENGTH = 4;
/** Distance from the canvas edge to the rotated y-axis title. */
const AXIS_TITLE_INSET = 12;

/**
 * MSA sequence coverage: rows coloured by identity to the query, with depth
 * traced over the top. One y-axis, since both are counted in sequences.
 */
@Component({
  selector: "app-msa-coverage",
  imports: [NgIconComponent, LoadingComponent],
  providers: [provideIcons({ heroExclamationCircle })],
  templateUrl: "./msa-coverage.component.html",
  styleUrl: "./msa-coverage.component.scss",
})
export class MsaCoverageComponent implements OnDestroy {
  coverage = input<MsaCoverage | null>(null);
  loading = input(false);
  errorMessage = input<string | null>(null);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>("plot");
  private readonly wrapperRef = viewChild<ElementRef<HTMLElement>>("wrapper");

  private readonly plotWidth = signal(0);
  private resizeObserver: ResizeObserver | null = null;
  private observedWrapper: HTMLElement | null = null;
  private frame: number | null = null;
  private baseImage: HTMLCanvasElement | null = null;
  private baseImageFor: MsaCoverage | null = null;

  readonly identityGradient = `linear-gradient(to right, ${identityGradientStops()})`;
  /** As matplotlib labels a vmin=0/vmax=1 colour bar. */
  readonly identityTicks = ["0.0", "0.2", "0.4", "0.6", "0.8", "1.0"];

  /** Plot area within the canvas, in CSS pixels. */
  readonly plotRect = computed(() => ({
    left: PADDING.left,
    top: PADDING.top,
    width: this.plotWidth(),
    height: PLOT_HEIGHT,
  }));

  readonly summary = computed(() => {
    const coverage = this.coverage();
    if (!coverage) return "";
    return (
      `Multiple sequence alignment coverage: ${coverage.totalSequences} ` +
      `sequences across ${coverage.length} residue positions.`
    );
  });

  constructor() {
    effect(() => {
      const wrapper = this.wrapperRef()?.nativeElement;
      untracked(() => this.observeResize(wrapper));
    });

    effect(() => {
      this.coverage();
      this.plotWidth();
      this.canvasRef();
      this.scheduleDraw();
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
  }

  private observeResize(wrapper: HTMLElement | undefined): void {
    if (wrapper === this.observedWrapper) return;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedWrapper = wrapper ?? null;
    if (!wrapper || typeof ResizeObserver === "undefined") return;

    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width <= 0) return;
      const available = Math.floor(width - PADDING.left - PADDING.right - 1);
      const next = Math.max(
        MIN_PLOT_WIDTH,
        Math.min(available, MAX_PLOT_WIDTH)
      );
      if (next !== this.plotWidth()) this.plotWidth.set(next);
      else this.scheduleDraw();
    });
    this.resizeObserver.observe(wrapper);
  }

  private scheduleDraw(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.draw();
    });
  }

  private draw(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const coverage = this.coverage();
    const width = this.plotWidth();
    if (!canvas || !coverage || width <= 0) return;

    const cssWidth = PADDING.left + width + PADDING.right;
    const cssHeight = PADDING.top + PLOT_HEIGHT + PADDING.bottom;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    this.drawSequenceMap(ctx, coverage, width);
    this.drawDepth(ctx, coverage, width);
    this.drawAxes(ctx, coverage, width);
  }

  /** Scaled by the total sequence count, or the axis would carry two rulers. */
  private drawDepth(
    ctx: CanvasRenderingContext2D,
    coverage: MsaCoverage,
    width: number
  ): void {
    const max = Math.max(1, coverage.totalSequences);

    ctx.save();
    ctx.beginPath();
    ctx.rect(PADDING.left, PADDING.top, width, PLOT_HEIGHT);
    ctx.clip();

    ctx.strokeStyle = DEPTH_INK;
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let index = 0; index < coverage.length; index++) {
      const x = PADDING.left + ((index + 0.5) / coverage.length) * width;
      const y =
        PADDING.top + PLOT_HEIGHT * (1 - coverage.perPosition[index] / max);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawSequenceMap(
    ctx: CanvasRenderingContext2D,
    coverage: MsaCoverage,
    width: number
  ): void {
    const base = this.ensureBaseImage(coverage);

    ctx.save();
    ctx.fillStyle = SURFACE;
    ctx.fillRect(PADDING.left, PADDING.top, width, PLOT_HEIGHT);
    ctx.imageSmoothingEnabled = coverage.sequences > PLOT_HEIGHT;
    ctx.drawImage(
      base,
      0,
      0,
      coverage.length,
      Math.max(coverage.sequences, 1),
      PADDING.left,
      PADDING.top,
      width,
      PLOT_HEIGHT
    );
    ctx.restore();
  }

  private ensureBaseImage(coverage: MsaCoverage): HTMLCanvasElement {
    if (this.baseImage && this.baseImageFor === coverage) return this.baseImage;

    const rows = Math.max(coverage.sequences, 1);
    const canvas = document.createElement("canvas");
    canvas.width = coverage.length;
    canvas.height = rows;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      const image = ctx.createImageData(coverage.length, rows);
      const lut = identityLut();

      for (let row = 0; row < rows; row++) {
        const stop =
          clamp(Math.round(coverage.identity[row] * 255), 0, 255) * 3;
        const r = lut[stop];
        const g = lut[stop + 1];
        const b = lut[stop + 2];

        const rowOffset = row * coverage.length;
        for (let col = 0; col < coverage.length; col++) {
          if (!coverage.covered[rowOffset + col]) continue;
          const offset = (rowOffset + col) * 4;
          image.data[offset] = r;
          image.data[offset + 1] = g;
          image.data[offset + 2] = b;
          image.data[offset + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    }

    this.baseImage = canvas;
    this.baseImageFor = coverage;
    return canvas;
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    coverage: MsaCoverage,
    width: number
  ): void {
    const top = PADDING.top;
    const bottom = top + PLOT_HEIGHT;

    ctx.save();
    ctx.strokeStyle = GRID_INK;
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING.left + 0.5, top + 0.5, width - 1, PLOT_HEIGHT);

    ctx.fillStyle = MUTED_INK;
    ctx.font = AXIS_TICK_FONT;

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const depthMax = Math.max(1, coverage.totalSequences);
    for (const value of axisTicks(depthMax, 5)) {
      const y = bottom - (value / depthMax) * PLOT_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left - AXIS_TICK_LENGTH, y);
      ctx.stroke();
      drawYTickLabel(ctx, String(value), PADDING.left - AXIS_LABEL_GAP, y, {
        top,
        height: PLOT_HEIGHT,
      });
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const value of axisTicks(coverage.length, 8)) {
      const x = PADDING.left + (value / coverage.length) * width;
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x, bottom + AXIS_TICK_LENGTH);
      ctx.stroke();
      drawXTickLabel(ctx, String(value), x, bottom + AXIS_LABEL_GAP, {
        left: PADDING.left,
        width,
      });
    }

    ctx.fillStyle = AXIS_INK;
    ctx.font = AXIS_TITLE_FONT;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      "Positions",
      PADDING.left + width / 2,
      bottom + PADDING.bottom - AXIS_TITLE_GAP
    );

    ctx.save();
    ctx.translate(AXIS_TITLE_INSET, top + PLOT_HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Sequences", 0, 0);
    ctx.restore();

    ctx.restore();
  }
}

/** Centred on its tick, but tucked inside the plot rather than overhanging it. */
function drawYTickLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  plot: { top: number; height: number }
): void {
  const metrics = ctx.measureText(label);
  const ascent = metrics.actualBoundingBoxAscent ?? 8;
  const descent = metrics.actualBoundingBoxDescent ?? 3;
  const bottom = plot.top + plot.height;

  if (y - ascent < plot.top) {
    ctx.textBaseline = "top";
    ctx.fillText(label, x, plot.top);
  } else if (y + descent > bottom) {
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, bottom);
  } else {
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }
  ctx.textBaseline = "middle";
}

/** As above, right-aligning the outermost label at the plot's right edge. */
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

/** Ticks from 0 to `max` on a round step landing near `count` ticks. */
function axisTicks(max: number, count: number): number[] {
  const step =
    TICK_STEPS.find((candidate) => candidate >= Math.max(1, max / count)) ??
    max;

  const ticks: number[] = [];
  for (let value = 0; value <= max; value += step) {
    ticks.push(value);
  }
  return ticks;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * matplotlib's `rainbow_r`, from its own definition rather than eyeballed stops:
 *   r(x) = |2x − 0.5| clipped to 1,  g(x) = sin(πx),  b(x) = cos(πx/2)
 */
function rainbowReversed(value: number): [number, number, number] {
  const x = 1 - clamp(value, 0, 1);
  return [
    Math.round(Math.min(Math.abs(2 * x - 0.5), 1) * 255),
    Math.round(Math.sin(Math.PI * x) * 255),
    Math.round(Math.cos((Math.PI * x) / 2) * 255),
  ];
}

let cachedLut: Uint8Array | null = null;

function identityLut(): Uint8Array {
  if (cachedLut) return cachedLut;

  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = rainbowReversed(i / 255);
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }

  cachedLut = lut;
  return lut;
}

/** Sampled from the same ramp, so the legend cannot drift from the plot. */
function identityGradientStops(steps = 12): string {
  return Array.from({ length: steps }, (_, index) => {
    const [r, g, b] = rainbowReversed(index / (steps - 1));
    return `rgb(${r} ${g} ${b})`;
  }).join(", ");
}
