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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["min"]) this._min.set(this.min);
    if (changes["max"]) this._max.set(this.max);
    if (changes["minValue"]) this.currentMin.set(this.minValue);
    if (changes["maxValue"]) this.currentMax.set(this.maxValue);
  }

  onMinInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const clamped = Math.min(val, this.currentMax() - 1);
    this.currentMin.set(clamped);
    (event.target as HTMLInputElement).value = String(clamped);
    this.rangeChange.emit({ min: clamped, max: this.currentMax() });
  }

  onMaxInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const clamped = Math.max(val, this.currentMin() + 1);
    this.currentMax.set(clamped);
    (event.target as HTMLInputElement).value = String(clamped);
    this.rangeChange.emit({ min: this.currentMin(), max: clamped });
  }
}
