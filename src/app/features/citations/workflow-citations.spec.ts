import {
  CITATION_KEYS_BY_TOOL,
  CITATION_KEYS_BY_WORKFLOW,
  formatCitation,
  formatCitationLinkLabel,
  getCitation,
  getCitations,
  getCitationsByTool,
  getCitationsByWorkflow,
  getRelevantCitations,
  getWorkflowPaperCitationKeys,
  getWorkflowPaperCitations,
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

  it("gets the same paper citation keys used by workflow forms", () => {
    expect(getWorkflowPaperCitationKeys("De Novo Design")).toEqual([
      "proteindj",
      "rfdiffusion",
      "bindcraft",
      "proteinmpnn",
      "openmm",
      "alphafold2",
      "alphafold2relax",
    ]);
    expect(
      getWorkflowPaperCitations("Single Structure Prediction").map(
        (citation) => citation.key
      )
    ).toEqual(["colabfold", "alphafold2", "callaway2020", "boltz2"]);
  });

  it("returns empty lists for unknown workflow paper citations", () => {
    expect(getWorkflowPaperCitationKeys("unknown workflow")).toEqual([]);
    expect(getWorkflowPaperCitationKeys(undefined)).toEqual([]);
    expect(getWorkflowPaperCitations("unknown workflow")).toEqual([]);
  });

  it("filters unknown citation keys from explicit citation lists", () => {
    const citations = getCitations(["alphafold2", "unknown", "colabfold"]);

    expect(citations.map((citation) => citation.key)).toEqual([
      "alphafold2",
      "colabfold",
    ]);
  });

  it("returns empty lists for unknown tool and workflow lookups", () => {
    expect(getCitationsByTool("unknown tool")).toEqual([]);
    expect(getCitationsByTool(undefined)).toEqual([]);
    expect(getCitationsByWorkflow("unknown workflow")).toEqual([]);
    expect(getCitationsByWorkflow(undefined)).toEqual([]);
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

  it("gets relevant citations from workflow-only and missing options", () => {
    expect(
      getRelevantCitations({ workflow: "Bulk Prediction" }).map(
        (citation) => citation.key
      )
    ).toEqual(["boltz2", "colabfold"]);
    expect(
      getRelevantCitations({
        workflow: "unknown workflow",
        tools: ["unknown tool"],
      })
    ).toEqual([]);
    expect(getRelevantCitations({})).toEqual([]);
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
