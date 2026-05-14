import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface ListboxSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: "app-listbox-select",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" (focusout)="handleFocusOut($event)">
      <button
        [id]="inputId"
        type="button"
        [attr.aria-expanded]="isOpen"
        aria-haspopup="listbox"
        [attr.aria-controls]="menuId"
        (click)="toggleMenu()"
        class="flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm text-slate-900 transition-colors focus:outline-none focus:ring-1"
        [class.border-red-400]="invalid"
        [class.focus:border-red-400]="invalid"
        [class.focus:ring-red-400]="invalid"
        [class.border-slate-300]="!invalid"
        [class.focus:border-blue-500]="!invalid"
        [class.focus:ring-blue-500]="!invalid"
      >
        <span class="block min-w-0 truncate">{{ selectedLabel }}</span>
        <svg
          class="ml-3 h-4 w-4 shrink-0 text-slate-500"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="m6 8 4 4 4-4"
          />
        </svg>
      </button>

      @if (isOpen) {
      <div
        [id]="menuId"
        role="listbox"
        tabindex="-1"
        class="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-59.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
      >
        @for (option of options; track option.value) {
        <button
          type="button"
          role="option"
          [attr.aria-selected]="value === option.value"
          (click)="selectOption(option.value)"
          class="flex min-h-8 w-full items-center rounded-lg px-2 py-1.5 text-left text-xs leading-tight text-slate-900 transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
          [class.bg-slate-100]="value === option.value"
        >
          {{ option.label }}
        </button>
        }
      </div>
      }
    </div>
  `,
})
export class ListboxSelectComponent {
  @Input({ required: true }) inputId!: string;
  @Input({ required: true }) options: ListboxSelectOption[] = [];
  @Input() value = "";
  @Input() placeholder = "Select an option";
  @Input() invalid = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();

  isOpen = false;

  get menuId(): string {
    return `${this.inputId}-menu`;
  }

  get selectedLabel(): string {
    return (
      this.options.find((option) => option.value === this.value)?.label ??
      this.placeholder
    );
  }

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  closeMenu(): void {
    this.isOpen = false;
  }

  selectOption(value: string): void {
    this.valueChange.emit(value);
    this.blurred.emit();
    this.closeMenu();
  }

  handleFocusOut(event: FocusEvent): void {
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    if (
      currentTarget instanceof HTMLElement &&
      relatedTarget instanceof Node &&
      currentTarget.contains(relatedTarget)
    ) {
      return;
    }

    this.blurred.emit();
    this.closeMenu();
  }
}
