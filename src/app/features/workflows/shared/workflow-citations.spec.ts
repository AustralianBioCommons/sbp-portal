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

  it("isCitedTool matches known tools", () => {
    const result = isCitedTool("boltz");
    expect(result).toBeTrue();
  });

  it("getToolCitation returns citation for tool", () => {
    const citation = getToolCitation("alphafold2");
    expect(citation.label).toEqual("AlphaFold2");
    expect(citation.reference).toContain("Highly accurate protein structure");
    expect(citation.doi).toContain("https://doi.org");
  });

  it("getToolCitations returns citations for multiple tools", () => {
    const citations = getToolCitations(["boltz", "alphafold2"]);
    expect(citations[0].label).toEqual("Boltz-2");
    expect(citations[1].label).toEqual("AlphaFold2");
  });
});
