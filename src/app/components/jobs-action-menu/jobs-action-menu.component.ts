import { CommonModule, NgStyle } from "@angular/common";
import { Component, input, output } from "@angular/core";

@Component({
  selector: "app-jobs-action-menu",
  standalone: true,
  imports: [CommonModule, NgStyle],
  template: `
    <div
      class="fixed z-30 w-52 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5"
      [ngStyle]="menuStyle()"
      (mousedown)="$event.stopPropagation()"
    >
      <div class="flex flex-col py-1">
        <button
          type="button"
          (click)="viewRequested.emit()"
          class="w-full px-4 py-2 text-left text-sm text-blue-900 hover:bg-gray-100 hover:text-blue-800"
        >
          View job details
        </button>
        <button
          type="button"
          (click)="cancelRequested.emit()"
          [disabled]="cancelDisabled()"
          class="w-full px-4 py-2 text-left text-sm text-blue-900 hover:bg-gray-100 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Stop
        </button>
        <button
          type="button"
          (click)="deleteRequested.emit()"
          [disabled]="deleteDisabled()"
          class="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  `
})
export class JobsActionMenuComponent {
  menuStyle = input<Record<string, string>>({});
  cancelDisabled = input(false);
  deleteDisabled = input(false);

  viewRequested = output<void>();
  cancelRequested = output<void>();
  deleteRequested = output<void>();
}
