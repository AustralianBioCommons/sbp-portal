import {
  DesignColumn,
  DesignRow,
  getDeNovoDesignAdapter,
  parseCsvTable,
  registerDeNovoDesignAdapter,
  sortDesignRows,
} from "./de-novo-results.utils";
import "./bindcraft-results.utils";

const row = (id: string, values: Record<string, string>): DesignRow => ({
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

describe("sortDesignRows", () => {
  const numeric: DesignColumn = {
    key: "Score",
    heading: "Score",
    numeric: true,
  };
  const text: DesignColumn = { key: "Design", heading: "Design" };

  const rows = [
    row("a", { Score: "0.75", Design: "gamma" }),
    row("b", { Score: "0.9", Design: "alpha" }),
    row("c", { Score: "0.8", Design: "beta" }),
  ];

  it("sorts a numeric column by value, not by string order", () => {
    expect(sortDesignRows(rows, numeric, "asc").map((r) => r.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("reverses on descending", () => {
    expect(sortDesignRows(rows, numeric, "desc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("sorts a text column alphabetically", () => {
    expect(sortDesignRows(rows, text, "asc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("leaves blanks last in both directions", () => {
    const withBlank = [...rows, row("d", { Score: "", Design: "" })];

    expect(sortDesignRows(withBlank, numeric, "asc").at(-1)!.id).toBe("d");
    expect(sortDesignRows(withBlank, numeric, "desc").at(-1)!.id).toBe("d");
  });

  it("falls back to text order when a numeric column holds words", () => {
    const words = [row("a", { Score: "high" }), row("b", { Score: "a-few" })];

    expect(sortDesignRows(words, numeric, "asc").map((r) => r.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("does not mutate the rows it was given", () => {
    const original = [...rows];
    sortDesignRows(rows, numeric, "desc");

    expect(rows).toEqual(original);
  });

  it("treats two blanks as equal", () => {
    const blanks = [row("a", { Score: "" }), row("b", { Score: "" })];

    expect(sortDesignRows(blanks, numeric, "asc").map((r) => r.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("the adapter registry", () => {
  it("resolves a tool however the job reports its casing", () => {
    expect(getDeNovoDesignAdapter("BindCraft")?.tool).toBe("bindcraft");
    expect(getDeNovoDesignAdapter("  bindcraft ")?.tool).toBe("bindcraft");
  });

  it("returns null for a workflow the report cannot render yet", () => {
    expect(getDeNovoDesignAdapter("rfdiffusion")).toBeNull();
    expect(getDeNovoDesignAdapter(null)).toBeNull();
    expect(getDeNovoDesignAdapter(undefined)).toBeNull();
  });

  it("accepts a newly registered workflow", () => {
    registerDeNovoDesignAdapter({
      tool: "test-tool",
      columns: [{ key: "rank", heading: "Rank" }],
      resultsFileName: "results.csv",
      findResultsArtifact: () => null,
      parseRows: () => [],
    });

    expect(getDeNovoDesignAdapter("Test-Tool")?.resultsFileName).toBe(
      "results.csv"
    );
  });
});
