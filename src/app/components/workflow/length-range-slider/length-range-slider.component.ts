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
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
      }
      .slider-wrapper {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }
      .slider-track {
        display: grid;
        align-items: center;
        width: 100%;
        height: 24px;
        margin: 4px 0;
        box-sizing: border-box;
      }
      .slider-track-bar {
        grid-area: 1/1;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        pointer-events: none;
      }
      .slider-fill {
        grid-area: 1/1;
        height: 6px;
        background: #3b82f6;
        border-radius: 3px;
        pointer-events: none;
      }
      input[type="range"] {
        grid-area: 1/1;
        width: 100%;
        height: 24px;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        pointer-events: none;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        pointer-events: all;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3b82f6;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        cursor: pointer;
      }
      input[type="range"]::-moz-range-thumb {
        pointer-events: all;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #3b82f6;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        cursor: pointer;
      }
      input[type="range"]:disabled::-webkit-slider-thumb {
        background: #9ca3af;
        cursor: not-allowed;
      }
      input[type="range"]:disabled::-moz-range-thumb {
        background: #9ca3af;
        cursor: not-allowed;
      }
    `,
  ],
  template: `
    <div class="slider-wrapper">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-gray-500">
          Min length: <strong class="text-gray-700">{{ currentMin() }}</strong>
        </div>
        <div class="text-xs text-gray-500">
          Max length: <strong class="text-gray-700">{{ currentMax() }}</strong>
        </div>
      </div>

      <div class="slider-track">
        <div class="slider-track-bar"></div>
        <div
          class="slider-fill"
          [style.margin-left.%]="fillLeft()"
          [style.margin-right.%]="fillRight()"
        ></div>
        <input
          type="range"
          [min]="_min()"
          [max]="_max()"
          [value]="currentMin()"
          [disabled]="disabled"
          (input)="onMinInput($event)"
        />
        <input
          type="range"
          [min]="_min()"
          [max]="_max()"
          [value]="currentMax()"
          [disabled]="disabled"
          (input)="onMaxInput($event)"
        />
      </div>

      <div class="flex items-center justify-between mt-1">
        <span class="text-xs text-gray-400">{{ _min() }}</span>
        <span class="text-xs text-gray-400">{{ _max() }}</span>
      </div>
    </div>
  `,
})
export class LengthRangeSliderComponent implements OnChanges {
  @Input() min = 0;
  @Input() max = 300;
  @Input() minValue = 65;
  @Input() maxValue = 65;
  @Input() disabled = false;
  @Output() rangeChange = new EventEmitter<LengthRange>();

  // Internal signals for min/max bounds so computed() tracks them reactively
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
