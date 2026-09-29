import { Component, computed, input, output, signal } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowDown,
  heroArrowUp,
  heroArrowsUpDown,
} from "@ng-icons/heroicons/outline";
import {
  ReportColumn,
  ReportRow,
  SortDirection,
  formatDecimals,
  sortReportRows,
} from "../../shared/job-results-report.utils";

@Component({
  selector: "app-job-results-table",
  imports: [NgIconComponent],
  providers: [provideIcons({ heroArrowDown, heroArrowUp, heroArrowsUpDown })],
  templateUrl: "./job-results-table.component.html",
  styleUrl: "./job-results-table.component.scss",
})
export class JobResultsTableComponent {
  columns = input.required<readonly ReportColumn[]>();
  rows = input.required<readonly ReportRow[]>();

  selectedId = input<string | null>(null);
  caption = input("Designs");
  framed = input(true);

  rowSelected = output<ReportRow>();

  readonly sortKey = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>("asc");

  readonly sortedRows = computed(() => {
    const key = this.sortKey();
    const column = this.columns().find((candidate) => candidate.key === key);
    if (!column) return [...this.rows()];
    return sortReportRows(this.rows(), column, this.sortDirection());
  });

  toggleSort(column: ReportColumn): void {
    if (this.sortKey() === column.key) {
      this.sortDirection.update((direction) =>
        direction === "asc" ? "desc" : "asc"
      );
    } else {
      this.sortKey.set(column.key);
      this.sortDirection.set(column.higherIsBetter ? "desc" : "asc");
    }
  }

  isSortable(column: ReportColumn): boolean {
    return column.sortable !== false;
  }

  ariaSort(column: ReportColumn): "ascending" | "descending" | "none" {
    if (this.sortKey() !== column.key) return "none";
    return this.sortDirection() === "asc" ? "ascending" : "descending";
  }

  sortIcon(column: ReportColumn): string {
    if (this.sortKey() !== column.key) return "heroArrowsUpDown";
    return this.sortDirection() === "asc" ? "heroArrowUp" : "heroArrowDown";
  }

  cellClasses(
    column: ReportColumn,
    row: ReportRow,
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

  cellText(column: ReportColumn, row: ReportRow): string {
    const value = row.values[column.key] ?? "";
    if (!value) return "—";
    return column.numeric ? formatDecimals(value) : value;
  }

  select(row: ReportRow): void {
    this.rowSelected.emit(row);
  }

  selectByKey(row: ReportRow, event: Event): void {
    event.preventDefault();
    this.select(row);
  }
}
