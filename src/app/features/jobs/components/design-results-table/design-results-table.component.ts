import { Component, computed, input, output, signal } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowDown,
  heroArrowUp,
  heroArrowsUpDown,
} from "@ng-icons/heroicons/outline";
import {
  DesignColumn,
  DesignRow,
  SortDirection,
  sortDesignRows,
} from "../../shared/de-novo-results.utils";

@Component({
  selector: "app-design-results-table",
  imports: [NgIconComponent],
  providers: [provideIcons({ heroArrowDown, heroArrowUp, heroArrowsUpDown })],
  templateUrl: "./design-results-table.component.html",
  styleUrl: "./design-results-table.component.scss",
})
export class DesignResultsTableComponent {
  columns = input.required<readonly DesignColumn[]>();
  rows = input.required<readonly DesignRow[]>();

  selectedId = input<string | null>(null);
  caption = input("Designs");
  framed = input(true);

  rowSelected = output<DesignRow>();

  readonly sortKey = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>("asc");

  readonly sortedRows = computed(() => {
    const key = this.sortKey();
    const column = this.columns().find((candidate) => candidate.key === key);
    if (!column) return [...this.rows()];
    return sortDesignRows(this.rows(), column, this.sortDirection());
  });

  toggleSort(column: DesignColumn): void {
    if (this.sortKey() === column.key) {
      this.sortDirection.update((direction) =>
        direction === "asc" ? "desc" : "asc"
      );
    } else {
      this.sortKey.set(column.key);
      this.sortDirection.set(column.higherIsBetter ? "desc" : "asc");
    }
  }

  isSortable(column: DesignColumn): boolean {
    return column.sortable !== false;
  }

  ariaSort(column: DesignColumn): "ascending" | "descending" | "none" {
    if (this.sortKey() !== column.key) return "none";
    return this.sortDirection() === "asc" ? "ascending" : "descending";
  }

  sortIcon(column: DesignColumn): string {
    if (this.sortKey() !== column.key) return "heroArrowsUpDown";
    return this.sortDirection() === "asc" ? "heroArrowUp" : "heroArrowDown";
  }

  cellClasses(
    column: DesignColumn,
    row: DesignRow,
    first: boolean,
    last: boolean
  ): string {
    const classes = column.sequence
      ? ["w-full", "font-mono", "text-xs", "wrap-anywhere"]
      : ["whitespace-nowrap"];
    if (column.emphasised) classes.push("font-medium", "text-gray-900");
    if (row.id === this.selectedId()) {
      classes.push("cap");
      if (first) classes.push("cap-left");
      if (last) classes.push("cap-right");
    }
    return classes.join(" ");
  }

  select(row: DesignRow): void {
    this.rowSelected.emit(row);
  }

  selectByKey(row: DesignRow, event: Event): void {
    event.preventDefault();
    this.select(row);
  }
}
