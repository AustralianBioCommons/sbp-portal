import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
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
export class LengthRangeSliderComponent {
  readonly min = input(0);
  readonly max = input(300);
  readonly minValue = input(65);
  readonly maxValue = input(65);
  readonly disabled = input(false);
  readonly rangeChange = output<LengthRange>();

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

  constructor() {
    effect(() => {
      const bounds = {
        min: Math.min(this.min(), this.max()),
        max: Math.max(this.min(), this.max()),
      };

      let normalizedMin: number;
      let normalizedMax: number;

      if (bounds.min === bounds.max) {
        normalizedMin = bounds.min;
        normalizedMax = bounds.max;
      } else {
        normalizedMin = this.clamp(
          Math.min(this.minValue(), this.maxValue()),
          bounds.min,
          bounds.max - 1
        );
        normalizedMax = this.clamp(
          Math.max(this.minValue(), this.maxValue()),
          bounds.min + 1,
          bounds.max
        );
      }

      this._min.set(bounds.min);
      this._max.set(bounds.max);
      this.currentMin.set(normalizedMin);
      this.currentMax.set(normalizedMax);
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  onMinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = this.clamp(
      Number(input.value),
      this._min(),
      this.currentMax() - 1
    );
    this.currentMin.set(val);
    input.value = String(val);
    this.rangeChange.emit({ min: val, max: this.currentMax() });
  }

  onMaxInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = this.clamp(
      Number(input.value),
      this.currentMin() + 1,
      this._max()
    );
    this.currentMax.set(val);
    input.value = String(val);
    this.rangeChange.emit({ min: this.currentMin(), max: val });
  }
}
