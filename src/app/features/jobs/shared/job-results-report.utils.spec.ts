import {
  ReportColumn,
  ReportRow,
  formatDecimals,
  getJobResultsAdapter,
  parseCsvTable,
  registerJobResultsAdapter,
  sortReportRows,
} from "./job-results-report.utils";
import "./rfdiffusion-results.utils";

describe("formatDecimals", () => {
  it("rounds a value with more than three places", () => {
    expect(formatDecimals("0.5428716540336609")).toBe("0.543");
    expect(formatDecimals("54.28716540336609")).toBe("54.287");
  });

  it("shows a shorter value exactly as written", () => {
    expect(formatDecimals("0.79")).toBe("0.79");
    expect(formatDecimals("1.00")).toBe("1.00");
    expect(formatDecimals("135")).toBe("135");
  });

  it("takes a number as well as text", () => {
    expect(formatDecimals(0.2869528830051422)).toBe("0.287");
    expect(formatDecimals(0.95)).toBe("0.95");
  });

  it("does not show negative zero", () => {
    expect(formatDecimals("-0.0001")).toBe("0");
  });

  it("passes non-numeric text through untouched", () => {
    expect(formatDecimals("NA")).toBe("NA");
    expect(formatDecimals("")).toBe("");
    expect(formatDecimals("1.2345x")).toBe("1.2345x");
  });
});

const row = (id: string, values: Record<string, string>): ReportRow => ({
  id,
  label: id,
  values,
  structure: null,
});

describe("parseCsvTable", () => {
  it("reads a header and its rows", () => {
    const table = parseCsvTable("Rank,Design\n1,alpha\n2,beta\n");

    expect(table.headers).toEqual(["Rank", "Design"]);
    expect(table.rows).toEqual([
      { Rank: "1", Design: "alpha" },
      { Rank: "2", Design: "beta" },
    ]);
  });

  it("keeps commas inside a quoted field", () => {
    const table = parseCsvTable('Rank,Residues,Score\n1,"B65,B69,B72",0.85\n');

    expect(table.rows[0]["Residues"]).toBe("B65,B69,B72");
    expect(table.rows[0]["Score"]).toBe("0.85");
  });

  it("keeps newlines inside a quoted field", () => {
    const table = parseCsvTable('Rank,Notes\n1,"first\nsecond"\n2,plain\n');

    expect(table.rows.length).toBe(2);
    expect(table.rows[0]["Notes"]).toBe("first\nsecond");
    expect(table.rows[1]["Notes"]).toBe("plain");
  });

  it("reads a doubled quote as one literal quote", () => {
    const table = parseCsvTable('Rank,Notes\n1,"say ""hi"""\n');

    expect(table.rows[0]["Notes"]).toBe('say "hi"');
  });

  it("handles CRLF line endings without emitting blank rows", () => {
    const table = parseCsvTable("Rank,Design\r\n1,alpha\r\n2,beta\r\n");

    expect(table.rows).toEqual([
      { Rank: "1", Design: "alpha" },
      { Rank: "2", Design: "beta" },
    ]);
  });

  it("reads a final row that has no trailing newline", () => {
    expect(parseCsvTable("Rank\n1\n2").rows.length).toBe(2);
  });

  it("leaves missing trailing columns empty rather than dropping the row", () => {
    const table = parseCsvTable("Rank,Design,Score\n1,alpha\n");

    expect(table.rows[0]).toEqual({ Rank: "1", Design: "alpha", Score: "" });
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsvTable("")).toEqual({ headers: [], rows: [] });
  });

  it("returns no rows for a header-only file", () => {
    expect(parseCsvTable("Rank,Design\n").rows).toEqual([]);
  });
});

describe("sortReportRows", () => {
  const numeric: ReportColumn = {
    key: "Score",
    heading: "Score",
    numeric: true,
  };
  const text: ReportColumn = { key: "Design", heading: "Design" };

  const rows = [
    row("a", { Score: "0.75", Design: "gamma" }),
    row("b", { Score: "0.9", Design: "alpha" }),
    row("c", { Score: "0.8", Design: "beta" }),
  ];

  it("sorts a numeric column by value, not by string order", () => {
    expect(sortReportRows(rows, numeric, "asc").map((r) => r.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("reverses on descending", () => {
    expect(sortReportRows(rows, numeric, "desc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("sorts a text column alphabetically", () => {
    expect(sortReportRows(rows, text, "asc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("leaves blanks last in both directions", () => {
    const withBlank = [...rows, row("d", { Score: "", Design: "" })];

    expect(sortReportRows(withBlank, numeric, "asc").at(-1)!.id).toBe("d");
    expect(sortReportRows(withBlank, numeric, "desc").at(-1)!.id).toBe("d");
  });

  it("falls back to text order when a numeric column holds words", () => {
    const words = [row("a", { Score: "high" }), row("b", { Score: "a-few" })];

    expect(sortReportRows(words, numeric, "asc").map((r) => r.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("does not mutate the rows it was given", () => {
    const original = [...rows];
    sortReportRows(rows, numeric, "desc");

    expect(rows).toEqual(original);
  });

  it("treats two blanks as equal", () => {
    const blanks = [row("a", { Score: "" }), row("b", { Score: "" })];

    expect(sortReportRows(blanks, numeric, "asc").map((r) => r.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("the adapter registry", () => {
  it("resolves a workflow and tool however the job reports their casing", () => {
    expect(getJobResultsAdapter("de novo design", "BindCraft")?.tool).toBe(
      "bindcraft"
    );
    expect(
      getJobResultsAdapter("  De Novo Design ", "  bindcraft ")?.tool
    ).toBe("bindcraft");
  });

  it("returns null for an unregistered tool, and for no tool at all", () => {
    expect(getJobResultsAdapter("de novo design", "boltzgen")).toBeNull();
    expect(getJobResultsAdapter("de novo design", "")).toBeNull();
    expect(getJobResultsAdapter("de novo design", null)).toBeNull();
    expect(getJobResultsAdapter("de novo design", undefined)).toBeNull();
    expect(getJobResultsAdapter(null, "bindcraft")).toBeNull();
  });

  it("keeps one tool's adapters apart across workflows", () => {
    expect(
      getJobResultsAdapter("interaction screening", "bindcraft")
    ).toBeNull();
  });

  it("accepts a newly registered workflow", () => {
    registerJobResultsAdapter({
      workflow: "test workflow",
      tool: "test-tool",
      columns: [{ key: "rank", heading: "Rank" }],
      resultsFileName: "results.csv",
      primaryChainId: "A",
      panelHeading: "Results",
      emptyMessage: "Nothing here.",
      legend: [{ label: "Binder", band: "primary" }],
      superpose: true,
      findResultsArtifact: () => null,
      parseRows: () => [],
    });

    expect(
      getJobResultsAdapter("Test Workflow", "Test-Tool")?.resultsFileName
    ).toBe("results.csv");
  });
});
