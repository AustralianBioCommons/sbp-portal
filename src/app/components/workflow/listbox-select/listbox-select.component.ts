import { Component, input, output, signal } from "@angular/core";

export interface ListboxSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: "app-listbox-select",
  imports: [],
  templateUrl: "./listbox-select.component.html",
  styleUrl: "./listbox-select.component.scss",
})
export class ListboxSelectComponent {
  readonly inputId = input.required<string>();
  readonly options = input.required<ListboxSelectOption[]>();
  readonly value = input("");
  readonly placeholder = input("Select an option");
  readonly invalid = input(false);

  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  readonly isOpen = signal(false);

  get menuId(): string {
    return `${this.inputId()}-menu`;
  }

  get selectedLabel(): string {
    return (
      this.options().find((option) => option.value === this.value())?.label ??
      this.placeholder()
    );
  }

  toggleMenu(): void {
    this.isOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isOpen.set(false);
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
