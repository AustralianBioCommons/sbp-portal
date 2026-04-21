import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  LengthRangeSliderComponent,
  LengthRange,
} from "./length-range-slider.component";

describe("LengthRangeSliderComponent", () => {
  let component: LengthRangeSliderComponent;
  let fixture: ComponentFixture<LengthRangeSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LengthRangeSliderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LengthRangeSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ── Signal input updates ─────────────────────────────────────────────────────

  it("should sync _min signal when min input changes", () => {
    fixture.componentRef.setInput("min", 10);
    fixture.detectChanges();
    expect(component._min()).toBe(10);
  });

  it("should sync _max signal when max input changes", () => {
    fixture.componentRef.setInput("max", 500);
    fixture.detectChanges();
    expect(component._max()).toBe(500);
  });

  it("should sync currentMin when minValue input changes", () => {
    fixture.componentRef.setInput("min", 0);
    fixture.componentRef.setInput("max", 300);
    fixture.componentRef.setInput("minValue", 50);
    fixture.detectChanges();
    expect(component.currentMin()).toBe(50);
  });

  it("should sync currentMax when maxValue input changes", () => {
    fixture.componentRef.setInput("min", 0);
    fixture.componentRef.setInput("max", 300);
    fixture.componentRef.setInput("maxValue", 200);
    fixture.detectChanges();
    expect(component.currentMax()).toBe(200);
  });

  // ── fillLeft / fillRight computed signals ────────────────────────────────────

  it("should compute fillLeft as 0 when currentMin equals _min", () => {
    fixture.componentRef.setInput("min", 0);
    fixture.componentRef.setInput("max", 100);
    fixture.componentRef.setInput("minValue", 0);
    fixture.componentRef.setInput("maxValue", 100);
    fixture.detectChanges();
    expect(component.fillLeft()).toBe(0);
  });

  it("should compute fillLeft as 50% when currentMin is halfway", () => {
    fixture.componentRef.setInput("min", 0);
    fixture.componentRef.setInput("max", 100);
    fixture.componentRef.setInput("minValue", 50);
    fixture.componentRef.setInput("maxValue", 100);
    fixture.detectChanges();
    expect(component.fillLeft()).toBe(50);
  });

  it("should compute fillRight as 0 when currentMax equals _max", () => {
    fixture.componentRef.setInput("min", 0);
    fixture.componentRef.setInput("max", 100);
    fixture.componentRef.setInput("minValue", 0);
    fixture.componentRef.setInput("maxValue", 100);
    fixture.detectChanges();
    expect(component.fillRight()).toBe(0);
  });

  it("should compute fillRight as 25% when currentMax is 75% of range", () => {
    fixture.componentRef.setInput("min", 0);
    fixture.componentRef.setInput("max", 100);
    fixture.componentRef.setInput("minValue", 0);
    fixture.componentRef.setInput("maxValue", 75);
    fixture.detectChanges();
    expect(component.fillRight()).toBe(25);
  });

  it("should return 0 for fillLeft and fillRight when _min equals _max", () => {
    fixture.componentRef.setInput("min", 100);
    fixture.componentRef.setInput("max", 100);
    fixture.detectChanges();
    expect(component.fillLeft()).toBe(0);
    expect(component.fillRight()).toBe(0);
  });

  // ── onMinInput ──────────────────────────────────────────────────────────────

  it("should update currentMin and emit rangeChange on min thumb move", () => {
    const emitted: LengthRange[] = [];
    component.rangeChange.subscribe((v) => emitted.push(v));
    component._max.set(100);
    component.currentMax.set(80);

    const input = document.createElement("input");
    input.value = "30";
    component.onMinInput({ target: input } as unknown as Event);

    expect(component.currentMin()).toBe(30);
    expect(emitted[0]).toEqual({ min: 30, max: 80 });
  });

  it("should clamp min to (currentMax - 1) when dragged past max thumb", () => {
    const emitted: LengthRange[] = [];
    component.rangeChange.subscribe((v) => emitted.push(v));
    component._max.set(100);
    component.currentMax.set(50);

    const input = document.createElement("input");
    input.value = "70";
    component.onMinInput({ target: input } as unknown as Event);

    expect(component.currentMin()).toBe(49);
    expect(input.value).toBe("49");
    expect(emitted[0]).toEqual({ min: 49, max: 50 });
  });

  // ── onMaxInput ──────────────────────────────────────────────────────────────

  it("should update currentMax and emit rangeChange on max thumb move", () => {
    const emitted: LengthRange[] = [];
    component.rangeChange.subscribe((v) => emitted.push(v));
    component._min.set(0);
    component.currentMin.set(20);

    const input = document.createElement("input");
    input.value = "90";
    component.onMaxInput({ target: input } as unknown as Event);

    expect(component.currentMax()).toBe(90);
    expect(emitted[0]).toEqual({ min: 20, max: 90 });
  });

  it("should clamp max to (currentMin + 1) when dragged below min thumb", () => {
    const emitted: LengthRange[] = [];
    component.rangeChange.subscribe((v) => emitted.push(v));
    component._min.set(0);
    component.currentMin.set(60);

    const input = document.createElement("input");
    input.value = "40";
    component.onMaxInput({ target: input } as unknown as Event);

    expect(component.currentMax()).toBe(61);
    expect(input.value).toBe("61");
    expect(emitted[0]).toEqual({ min: 60, max: 61 });
  });

  // ── Default signal values ────────────────────────────────────────────────────

  it("should initialise with default signal values", () => {
    expect(component._min()).toBe(0);
    expect(component._max()).toBe(300);
    expect(component.currentMin()).toBe(65);
    expect(component.currentMax()).toBe(65);
  });

  // ── LengthRange interface ────────────────────────────────────────────────────

  it("should emit a LengthRange object with correct shape", () => {
    const emitted: LengthRange[] = [];
    component.rangeChange.subscribe((v) => emitted.push(v));
    component.currentMax.set(200);

    const input = document.createElement("input");
    input.value = "50";
    component.onMinInput({ target: input } as unknown as Event);

    expect(emitted[0]).toEqual(jasmine.objectContaining({ min: 50, max: 200 }));
  });
});
