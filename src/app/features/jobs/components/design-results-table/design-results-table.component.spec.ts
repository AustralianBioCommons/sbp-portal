import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DesignResultsTableComponent } from "./design-results-table.component";
import { DesignColumn, DesignRow } from "../../shared/de-novo-results.utils";

const columns: DesignColumn[] = [
  { key: "Rank", heading: "Rank", emphasised: true, numeric: true },
  { key: "Score", heading: "ipTM", numeric: true },
  { key: "Design", heading: "Design name" },
];

/** `count` designs, ranked 1..count with a score that falls as the rank rises. */
const makeRows = (count: number): DesignRow[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `design-${index + 1}`,
    label: `design-${index + 1}`,
    values: {
      Rank: String(index + 1),
      Score: (1 - index / 100).toFixed(2),
      Design: `design-${index + 1}`,
    },
    structure: null,
  }));

describe("DesignResultsTableComponent", () => {
  let fixture: ComponentFixture<DesignResultsTableComponent>;
  let component: DesignResultsTableComponent;

  const render = (rows: DesignRow[]) => {
    fixture = TestBed.createComponent(DesignResultsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("columns", columns);
    fixture.componentRef.setInput("rows", rows);
    fixture.detectChanges();
  };

  const bodyRows = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll("tbody tr")
    ) as HTMLTableRowElement[];

  const headers = () =>
    Array.from(fixture.nativeElement.querySelectorAll("th")) as HTMLElement[];

  const cellText = (row: HTMLTableRowElement) =>
    Array.from(row.querySelectorAll("td")).map((cell) =>
      cell.textContent!.trim()
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignResultsTableComponent],
    }).compileComponents();
  });

  it("renders the columns it is given, in order", () => {
    render(makeRows(3));

    expect(headers().map((th) => th.textContent!.trim())).toEqual([
      "Rank",
      "ipTM",
      "Design name",
    ]);
    expect(cellText(bodyRows()[0])).toEqual(["1", "1.00", "design-1"]);
  });

  it("emphasises only the columns that asked for it", () => {
    render(makeRows(1));

    const buttons = headers().map((th) => th.querySelector("button")!);
    expect(buttons[0].classList).toContain("font-bold");
    expect(buttons[1].classList).toContain("font-medium");
  });

  it("shows an em dash for a value the file left blank", () => {
    render([
      {
        id: "a",
        label: "a",
        values: { Rank: "1", Score: "", Design: "a" },
        structure: null,
      },
    ]);

    expect(cellText(bodyRows()[0])[1]).toBe("—");
  });

  // ── The whole list ───────────────────────────────────────────────────────

  it("shows every design at once, in one scrollable list", () => {
    render(makeRows(25));

    expect(bodyRows().length).toBe(25);
    expect(cellText(bodyRows()[0])[0]).toBe("1");
    expect(cellText(bodyRows()[24])[0]).toBe("25");
  });

  it("says so when there is nothing to show", () => {
    render([]);

    expect(bodyRows()[0].textContent).toContain("No designs to display");
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  it("starts in the file's own order", () => {
    render(makeRows(5));

    expect(component.sortKey()).toBeNull();
    expect(bodyRows().map((row) => cellText(row)[0])).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("sorts ascending on the first click and descending on the second", () => {
    render(makeRows(5));
    const scoreHeader = headers()[1].querySelector("button")!;

    scoreHeader.click();
    fixture.detectChanges();
    expect(bodyRows().map((row) => cellText(row)[1])).toEqual([
      "0.96",
      "0.97",
      "0.98",
      "0.99",
      "1.00",
    ]);

    scoreHeader.click();
    fixture.detectChanges();
    expect(cellText(bodyRows()[0])[1]).toBe("1.00");
  });

  it("starts a newly picked column ascending", () => {
    render(makeRows(5));

    headers()[1].querySelector("button")!.click();
    headers()[1].querySelector("button")!.click();
    headers()[2].querySelector("button")!.click();

    expect(component.sortKey()).toBe("Design");
    expect(component.sortDirection()).toBe("asc");
  });

  it("opens a higher-is-better column descending, so the best rows lead", () => {
    fixture = TestBed.createComponent(DesignResultsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("columns", [
      columns[0],
      { ...columns[1], higherIsBetter: true },
      columns[2],
    ]);
    fixture.componentRef.setInput("rows", makeRows(5));
    fixture.detectChanges();

    headers()[1].querySelector("button")!.click();
    fixture.detectChanges();

    expect(component.sortDirection()).toBe("desc");
    expect(cellText(bodyRows()[0])[1]).toBe("1.00");
    // Rank and its metric agree on the leading row.
    headers()[0].querySelector("button")!.click();
    fixture.detectChanges();
    expect(cellText(bodyRows()[0])[0]).toBe("1");
  });

  it("left-aligns a heading that wraps, matching the cells below it", () => {
    render(makeRows(3));

    // A <button> centres its own text, so a wrapped heading would drift.
    const heading = headers()[0].querySelector("button")!;
    expect(getComputedStyle(heading).textAlign).toBe("left");
  });

  it("offers no sort on a column with no meaningful order", () => {
    fixture = TestBed.createComponent(DesignResultsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("columns", [
      columns[0],
      { ...columns[2], sortable: false },
    ]);
    fixture.componentRef.setInput("rows", makeRows(3));
    fixture.detectChanges();

    const [sortable, plain] = headers();
    expect(sortable.querySelector("button")).not.toBeNull();
    expect(plain.querySelector("button")).toBeNull();
    expect(plain.getAttribute("aria-sort")).toBeNull();
    expect(plain.textContent!.trim()).toBe("Design name");
  });

  it("reports the sorted column through aria-sort", () => {
    render(makeRows(5));

    expect(headers().map((th) => th.getAttribute("aria-sort"))).toEqual([
      "none",
      "none",
      "none",
    ]);

    headers()[0].querySelector("button")!.click();
    fixture.detectChanges();
    expect(headers()[0].getAttribute("aria-sort")).toBe("ascending");

    headers()[0].querySelector("button")!.click();
    fixture.detectChanges();
    expect(headers()[0].getAttribute("aria-sort")).toBe("descending");
  });

  it("marks the sorted column with a direction icon", () => {
    render(makeRows(5));

    expect(component.sortIcon(columns[0])).toBe("heroArrowsUpDown");
    component.toggleSort(columns[0]);
    expect(component.sortIcon(columns[0])).toBe("heroArrowUp");
    component.toggleSort(columns[0]);
    expect(component.sortIcon(columns[0])).toBe("heroArrowDown");
  });

  it("sorts the whole list, not the rows in view", () => {
    render(makeRows(25));

    component.toggleSort(columns[0]);
    component.sortDirection.set("desc");
    fixture.detectChanges();

    expect(cellText(bodyRows()[0])[0]).toBe("25");
    expect(cellText(bodyRows()[24])[0]).toBe("1");
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it("emits the row a click selects", () => {
    render(makeRows(3));
    const selected: DesignRow[] = [];
    component.rowSelected.subscribe((row) => selected.push(row));

    bodyRows()[1].click();

    expect(selected.map((row) => row.id)).toEqual(["design-2"]);
  });

  it("emits on Enter and on Space, so the table works from the keyboard", () => {
    render(makeRows(3));
    const selected: DesignRow[] = [];
    component.rowSelected.subscribe((row) => selected.push(row));

    bodyRows()[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    bodyRows()[2].dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );

    expect(selected.map((row) => row.id)).toEqual(["design-1", "design-3"]);
  });

  it("does not let Space scroll the page while selecting", () => {
    render(makeRows(3));
    const space = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });

    bodyRows()[0].dispatchEvent(space);

    expect(space.defaultPrevented).toBeTrue();
  });

  it("marks the selected row for assistive technology and for the eye", () => {
    render(makeRows(3));
    fixture.componentRef.setInput("selectedId", "design-2");
    fixture.detectChanges();

    expect(bodyRows().map((row) => row.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(bodyRows()[1].classList).toContain("bg-green-50");
    // Outranks the grey hover, so a selected row keeps its tint.
    expect(bodyRows()[1].classList).toContain(
      "aria-selected:hover:bg-green-50"
    );
  });

  it("boxes the selected row in, rather than tinting it like a stripe", () => {
    render(makeRows(3));
    fixture.componentRef.setInput("selectedId", "design-2");
    fixture.detectChanges();

    // Inset shadows, not borders: count each cell's edges.
    const edges = (cell: Element) =>
      getComputedStyle(cell as HTMLElement).boxShadow.split("inset").length - 1;
    const cells = Array.from(bodyRows()[1].querySelectorAll("td"));

    // Sides only on the flanks, so no rules run between the columns.
    expect(edges(cells[0])).toBe(3);
    expect(edges(cells[1])).toBe(2);
    expect(edges(cells[cells.length - 1])).toBe(3);

    expect(edges(bodyRows()[0].querySelector("td")!)).toBe(0);
    expect(bodyRows()[1].classList).toContain("bg-green-50");
  });

  it("seats the first row directly against the header", () => {
    render(makeRows(3));

    const thead = fixture.nativeElement.querySelector("thead") as HTMLElement;
    const firstRow = bodyRows()[0];

    // A rule here reads as a grey seam against the dark header.
    expect(getComputedStyle(thead).borderBottomWidth).toBe("0px");
    expect(thead.getBoundingClientRect().bottom).toBe(
      firstRow.getBoundingClientRect().top
    );
  });

  it("keeps the header flush with the table when a row is selected", () => {
    render(makeRows(3));
    const edges = () => {
      const table = (
        fixture.nativeElement.querySelector("table") as HTMLElement
      ).getBoundingClientRect();
      const head = (
        fixture.nativeElement.querySelector("thead") as HTMLElement
      ).getBoundingClientRect();
      return [head.left - table.left, table.right - head.right];
    };
    expect(edges()).toEqual([0, 0]);

    fixture.componentRef.setInput("selectedId", "design-2");
    fixture.detectChanges();

    // A border at the table's edge is half outside it, insetting the header.
    expect(edges()).toEqual([0, 0]);
  });

  it("costs the table no height at all", () => {
    render(makeRows(3));
    const tableHeight = () =>
      (
        fixture.nativeElement.querySelector("table") as HTMLElement
      ).getBoundingClientRect().height;
    const unselected = tableHeight();

    fixture.componentRef.setInput("selectedId", "design-2");
    fixture.detectChanges();
    expect(tableHeight()).toBe(unselected);

    // Nor does moving it.
    fixture.componentRef.setInput("selectedId", "design-3");
    fixture.detectChanges();
    expect(tableHeight()).toBe(unselected);
  });
});
