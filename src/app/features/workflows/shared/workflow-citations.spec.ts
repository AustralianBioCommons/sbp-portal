import {
  normalizeTool,
  isCitedTool,
  getToolCitation,
  getToolCitations,
} from "./workflow-citations";

describe("Workflow Citations utilities", () => {
  it("normalizeTool trims and lowercases", () => {
    const result = normalizeTool("  AlphaFold2  ");
    expect(result).toEqual("alphafold2");
  });

  it("normalizeTool returns an empty string for undefined", () => {
    expect(normalizeTool(undefined)).toBe("");
  });

  it("isCitedTool matches known tools", () => {
    const result = isCitedTool("boltz");
    expect(result).toBeTrue();
  });

  it("isCitedTool rejects unknown or empty tools", () => {
    expect(isCitedTool("rfdiffusion")).toBeFalse();
    expect(isCitedTool("")).toBeFalse();
    expect(isCitedTool(undefined)).toBeFalse();
  });

  it("getToolCitation returns citation for tool", () => {
    const citation = getToolCitation("alphafold2");
    expect(citation?.label).toEqual("AlphaFold2");
    expect(citation?.reference).toContain("Highly accurate protein structure");
    expect(citation?.doi).toContain("https://doi.org");
  });

  it("getToolCitation normalizes casing and whitespace", () => {
    const citation = getToolCitation("  ColabFold  ");
    expect(citation?.label).toBe("ColabFold");
    expect(citation?.doi).toBe("https://doi.org/10.1038/s41592-022-01488-1");
  });

  it("getToolCitation returns null for unsupported tools", () => {
    expect(getToolCitation("rfdiffusion")).toBeNull();
    expect(getToolCitation(undefined)).toBeNull();
  });

  it("getToolCitation includes the BindCraft citation", () => {
    const citation = getToolCitation("bindcraft");
    expect(citation?.label).toBe("BindCraft");
    expect(citation?.reference).toContain("one-shot design");
    expect(citation?.doi).toBe("https://doi.org/10.1101/2024.09.30.615802");
  });

  it("getToolCitations returns citations for multiple tools", () => {
    const citations = getToolCitations(["boltz", "alphafold2"]);
    expect(citations[0].label).toEqual("Boltz-2");
    expect(citations[1].label).toEqual("AlphaFold2");
  });

  it("getToolCitations filters unsupported tools and preserves supported order", () => {
    const citations = getToolCitations([
      "rfdiffusion",
      " bindcraft ",
      "unknown",
      "BOLTZ",
      "",
      "colabfold",
    ]);

    expect(citations.map((citation) => citation.label)).toEqual([
      "BindCraft",
      "Boltz-2",
      "ColabFold",
    ]);
  });
});
