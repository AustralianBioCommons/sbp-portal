import {
  Component,
  computed,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from "@angular/core";

export interface LengthRange {
  min: number;
  max: number;
}

@Component({
  selector: "app-length-range-slider",
  standalone: true,
  imports: [],
  templateUrl: "./length-range-slider.component.html",
})
export class LengthRangeSliderComponent implements OnChanges {
  @Input() min = 0;
  @Input() max = 300;
  @Input() minValue = 65;
  @Input() maxValue = 65;
  @Input() disabled = false;
  @Output() rangeChange = new EventEmitter<LengthRange>();

  readonly _min = signal(0);
  readonly _max = signal(300);
  readonly currentMin = signal(65);
  readonly currentMax = signal(65);

  readonly fillLeft = computed(() =>
    this._max() > this._min()
      ? ((this.currentMin() - this._min()) / (this._max() - this._min())) * 100
      : 0
  );
  readonly fillRight = computed(() =>
    this._max() > this._min()
      ? ((this._max() - this.currentMax()) / (this._max() - this._min())) * 100
      : 0
  );

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private getNormalizedBounds(): LengthRange {
    return {
      min: Math.min(this.min, this.max),
      max: Math.max(this.min, this.max),
    };
  }

  private normalizeRange(
    minValue: number,
    maxValue: number,
    bounds: LengthRange
  ): LengthRange {
    if (bounds.min === bounds.max) {
      return { min: bounds.min, max: bounds.max };
    }

    const normalizedMin = this.clamp(
      Math.min(minValue, maxValue),
      bounds.min,
      bounds.max - 1
    );
    const normalizedMax = this.clamp(
      Math.max(minValue, maxValue),
      bounds.min + 1,
      bounds.max
    );

    return { min: normalizedMin, max: normalizedMax };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["min"] || changes["max"] || changes["minValue"] || changes["maxValue"]) {
      const bounds = this.getNormalizedBounds();
      const range = this.normalizeRange(this.minValue, this.maxValue, bounds);

      this._min.set(bounds.min);
      this._max.set(bounds.max);
      this.currentMin.set(range.min);
      this.currentMax.set(range.max);
    }
  }

  onMinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    const range = this.normalizeRange(val, this.currentMax(), {
      min: this._min(),
      max: this._max(),
    });

    this.currentMin.set(range.min);
    input.value = String(range.min);
    this.rangeChange.emit({ min: range.min, max: this.currentMax() });
  }

  onMaxInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    const range = this.normalizeRange(this.currentMin(), val, {
      min: this._min(),
      max: this._max(),
    });

    this.currentMax.set(range.max);
    input.value = String(range.max);
    this.rangeChange.emit({ min: this.currentMin(), max: range.max });
  }
}
