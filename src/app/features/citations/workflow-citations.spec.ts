import {
  CITATION_KEYS_BY_TOOL,
  CITATION_KEYS_BY_WORKFLOW,
  formatCitation,
  formatCitationLinkLabel,
  getCitation,
  getCitationsByTool,
  getCitationsByWorkflow,
  getRelevantCitations,
} from "./workflow-citations";

describe("Workflow Citations utilities", () => {
  it("returns a keyed citation from the master list", () => {
    const citation = getCitation("alphafold2");

    expect(citation?.key).toBe("alphafold2");
    expect(citation?.title).toBe(
      "Highly accurate protein structure prediction with AlphaFold"
    );
    expect(citation?.doi).toBe("https://doi.org/10.1038/s41586-021-03819-2");
  });

  it("normalizes citation keys for lookup", () => {
    const citation = getCitation("  alpha fold 2  ");

    expect(citation?.key).toBe("alphafold2");
  });

  it("returns null for an unknown citation key", () => {
    expect(getCitation("unknown")).toBeNull();
    expect(getCitation(undefined)).toBeNull();
  });

  it("builds tool-to-citation records", () => {
    expect(CITATION_KEYS_BY_TOOL["boltz"]).toEqual(["boltz2"]);
    expect(CITATION_KEYS_BY_TOOL["rfdiffusion"]).toContain("rfdiffusion");
  });

  it("builds workflow-to-citation records", () => {
    expect(CITATION_KEYS_BY_WORKFLOW["de novo design"]).toContain("proteindj");
    expect(CITATION_KEYS_BY_WORKFLOW["bulk prediction"]).toEqual([
      "boltz2",
      "colabfold",
    ]);
  });

  it("gets citations by tool", () => {
    const citations = getCitationsByTool("  BindCraft  ");

    expect(citations.map((citation) => citation.key)).toEqual([
      "bindcraft",
      "alphafold2",
      "alphafold2relax",
      "openmm",
      "proteindj",
      "proteinmpnn",
    ]);
  });

  it("gets citations by workflow", () => {
    const citations = getCitationsByWorkflow("Bulk Prediction");

    expect(citations.map((citation) => citation.key)).toEqual([
      "boltz2",
      "colabfold",
    ]);
  });

  it("gets relevant citations from workflow and tools without duplicates", () => {
    const citations = getRelevantCitations({
      workflow: "Single Prediction",
      tools: ["alphafold2", "boltz"],
    });

    expect(citations.map((citation) => citation.key)).toEqual([
      "alphafold2",
      "boltz2",
      "callaway2020",
      "colabfold",
    ]);
  });

  it("formats full citations and inline labels", () => {
    const citation = getCitation("colabfold");

    expect(citation).not.toBeNull();
    expect(formatCitation(citation!)).toContain(
      "Mirdita, M., Schuetze, K., Moriwaki, Y. et al. ColabFold: making protein folding accessible to all. Nat Methods 19, 679-682 (2022)."
    );
    expect(formatCitationLinkLabel(citation!)).toBe("Mirdita, 2022");
  });

  it("includes the AlphaFold2 Initial Guess and ProteinMPNN-FastRelax citation", () => {
    const citation = getCitation("alphafold2relax");

    expect(citation?.label).toBe(
      "AlphaFold2 Initial Guess and ProteinMPNN-FastRelax"
    );
    expect(citation?.doi).toBe("https://doi.org/10.1038/s41467-023-38328-5");
    expect(formatCitation(citation!)).toBe(
      "Bennett, N.R., Coventry, B., Goreshnik, I. et al. Improving de novo protein binder design with deep learning. Nat Commun 14, 2625 (2023)."
    );
  });
});
