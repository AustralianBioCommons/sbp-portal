import { ComponentFixture, TestBed } from "@angular/core/testing";

import { MsaCoverageComponent } from "./msa-coverage.component";
import { parseMsaCoverage } from "../../shared/prediction-results.utils";

/** 3 sequences over 4 positions; 21 is the gap token. */
const coverage = parseMsaCoverage("1\t2\t3\t4\n1\t2\t21\t21\n21\t21\t3\t4\n");

describe("MsaCoverageComponent", () => {
  let fixture: ComponentFixture<MsaCoverageComponent>;
  let component: MsaCoverageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MsaCoverageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MsaCoverageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("coverage", coverage);
    fixture.detectChanges();
  });

  const waitForDraw = async (canvas: HTMLCanvasElement) => {
    for (let attempt = 0; attempt < 25 && !canvas.style.width; attempt++) {
      fixture.detectChanges();
      await new Promise(requestAnimationFrame);
    }
    expect(canvas.style.width).toBeTruthy();
  };

  it("creates", () => {
    expect(component).toBeTruthy();
  });

  it("describes the alignment for assistive technology", () => {
    expect(component.summary()).toBe(
      "Multiple sequence alignment coverage: 3 sequences across 4 residue positions."
    );
  });

  const measuredColumn = (canvas: HTMLCanvasElement): HTMLElement => {
    const column = canvas.closest(".overflow-hidden");
    expect(column).not.toBeNull();
    return column as HTMLElement;
  };

  it("draws within its container", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "360px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const column = measuredColumn(canvas);
    expect(canvas.offsetWidth).toBeGreaterThan(0);
    expect(canvas.offsetWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
  });

  it("centres the plot in a column wider than its cap when asked", async () => {
    fixture.componentRef.setInput("centered", true);
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "1400px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const column = measuredColumn(canvas);
    const slack = column.clientWidth - canvas.offsetWidth;
    expect(slack).toBeGreaterThan(0);
    expect(canvas.getBoundingClientRect().left).toBeCloseTo(
      column.getBoundingClientRect().left + slack / 2,
      0
    );
  });

  it("leaves the plot at the left edge by default", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "1400px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const column = measuredColumn(canvas);
    expect(canvas.getBoundingClientRect().left).toBeCloseTo(
      column.getBoundingClientRect().left,
      0
    );
  });

  it("uses matplotlib's reversed rainbow for identity", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "420px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const ratio = canvas.width / parseFloat(canvas.style.width);
    const ctx = canvas.getContext("2d")!;
    const plot = component.plotRect();

    const px = ctx.getImageData(
      Math.round((plot.left + 4) * ratio),
      Math.round((plot.top + 4) * ratio),
      1,
      1
    ).data;

    expect(px[0]).toBe(128);
    expect(px[1]).toBe(0);
    expect(px[2]).toBe(255);
  });

  it("builds the legend from the same ramp as the cells", () => {
    expect(component.identityGradient).toContain("rgb(255 0 0)");
    expect(component.identityGradient).toContain("rgb(128 0 255)");
  });

  it("renders an error instead of the plot", () => {
    fixture.componentRef.setInput("errorMessage", "Bad alignment");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Bad alignment");
  });

  it("reports when no alignment is available", () => {
    fixture.componentRef.setInput("coverage", null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("No alignment");
  });

  const settle = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      fixture.detectChanges();
      await new Promise(requestAnimationFrame);
    }
  };

  it("keeps the plot at its capped width as the container grows", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "1200px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);
    const capped = component.plotRect().width;

    host.style.width = "1600px";
    await settle();

    expect(component.plotRect().width).toBe(capped);
  });

  it("keeps the last measurement when the container collapses", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "480px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);
    const measured = component.plotRect().width;

    host.style.width = "0px";
    await settle();

    expect(component.plotRect().width).toBe(measured);
  });

  it("labels both axes from zero", async () => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.width = "480px";
    const canvas: HTMLCanvasElement = host.querySelector("canvas")!;
    await waitForDraw(canvas);

    const plot = component.plotRect();
    expect(plot.left).toBeGreaterThan(0);
    expect(parseFloat(canvas.style.height)).toBeGreaterThan(plot.height);
  });
});
