export interface Citation {
  label: string;
  title: string;
  authors: string;
  firstAuthor: string;
  year: string;
  url?: string;
  doi: string;
  formattedCitation: string;
  workflows: string[];
  tools: string[];
}

export type CitationKey = keyof typeof CITATIONS;
export type CitationRecord = Citation & { key: CitationKey };

export const CITATIONS = {
  alphafold2: {
    label: "AlphaFold2",
    title: "Highly accurate protein structure prediction with AlphaFold",
    authors: "Jumper, J., Evans, R., Pritzel, A. et al.",
    firstAuthor: "Jumper",
    year: "2021",
    doi: "https://doi.org/10.1038/s41586-021-03819-2",
    formattedCitation:
      "Jumper, J., Evans, R., Pritzel, A. et al. Highly accurate protein structure prediction with AlphaFold. Nature 596, 583-589 (2021).",
    workflows: ["single prediction", "de novo design"],
    tools: ["alphafold2", "bindcraft"],
  },
  alphafold2relax: {
    label: "AlphaFold2 Initial Guess and ProteinMPNN-FastRelax",
    title: "Improving de novo protein binder design with deep learning",
    authors: "Bennett, N.R., Coventry, B., Goreshnik, I. et al.",
    firstAuthor: "Bennett",
    year: "2023",
    doi: "https://doi.org/10.1038/s41467-023-38328-5",
    formattedCitation:
      "Bennett, N.R., Coventry, B., Goreshnik, I. et al. Improving de novo protein binder design with deep learning. Nat Commun 14, 2625 (2023).",
    workflows: ["de novo design"],
    tools: ["bindcraft", "rfdiffusion"],
  },
  boltz2: {
    label: "Boltz-2",
    title:
      "Boltz-2: Towards Accurate and Efficient Binding Affinity Prediction",
    authors: "Passaro, S., Corso, G., Wohlwend, J. et al.",
    firstAuthor: "Passaro",
    year: "2025",
    doi: "https://doi.org/10.1101/2025.06.14.659707",
    formattedCitation:
      "Passaro, S., Corso, G., Wohlwend, J. et al. Boltz-2: Towards Accurate and Efficient Binding Affinity Prediction. bioRxiv 2025.06.14.659707 (2025).",
    workflows: [
      "single prediction",
      "bulk prediction",
      "interaction screening",
    ],
    tools: ["boltz"],
  },
  bindcraft: {
    label: "BindCraft",
    title: "BindCraft: one-shot design of functional protein binders",
    authors:
      "Pacesa, M., Nickel, L., Schellhaas, C., Schmidt, J., Pyatova, E. et al.",
    firstAuthor: "Pacesa",
    year: "2024",
    doi: "https://doi.org/10.1101/2024.09.30.615802",
    formattedCitation:
      "Pacesa, M., Nickel, L., Schellhaas, C., Schmidt, J., Pyatova, E. et al. BindCraft: one-shot design of functional protein binders. bioRxiv 2024.09.30.615802 (2024).",
    workflows: ["de novo design"],
    tools: ["bindcraft"],
  },
  callaway2020: {
    label: "AlphaFold news",
    title:
      "'It will change everything': DeepMind's AI makes gigantic leap in solving protein structures",
    authors: "Callaway, E.",
    firstAuthor: "Callaway",
    year: "2020",
    doi: "https://doi.org/10.1038/d41586-020-03348-4",
    formattedCitation:
      "Callaway, E. 'It will change everything': DeepMind's AI makes gigantic leap in solving protein structures. Nature 588, 203-204 (2020).",
    workflows: ["single prediction"],
    tools: ["alphafold2"],
  },
  colabfold: {
    label: "ColabFold",
    title: "ColabFold: making protein folding accessible to all",
    authors: "Mirdita, M., Schuetze, K., Moriwaki, Y. et al.",
    firstAuthor: "Mirdita",
    year: "2022",
    doi: "https://doi.org/10.1038/s41592-022-01488-1",
    formattedCitation:
      "Mirdita, M., Schuetze, K., Moriwaki, Y. et al. ColabFold: making protein folding accessible to all. Nat Methods 19, 679-682 (2022).",
    workflows: [
      "single prediction",
      "bulk prediction",
      "interaction screening",
    ],
    tools: ["colabfold"],
  },
  openmm: {
    label: "OpenMM",
    title:
      "OpenMM 7: Rapid development of high performance algorithms for molecular dynamics",
    authors: "Eastman, P., Swails, J., Chodera, J. D. et al.",
    firstAuthor: "Eastman",
    year: "2017",
    doi: "https://doi.org/10.1371/journal.pcbi.1005659",
    formattedCitation:
      "Eastman, P., Swails, J., Chodera, J.D. et al. OpenMM 7: Rapid development of high performance algorithms for molecular dynamics. PLoS Comput Biol 13, e1005659 (2017).",
    workflows: ["de novo design"],
    tools: ["bindcraft", "rfdiffusion"],
  },
  proteindj: {
    label: "ProteinDJ",
    title: "ProteinDJ: a high-performance and modular protein design pipeline",
    authors:
      "Silke, D., Iskander, J., Pan, J., Thompson, A.P., Papenfuss, A.T., Lucet, I.S., Hardy, J.M.",
    firstAuthor: "Silke",
    year: "2026",
    doi: "https://doi.org/10.1002/pro.70464",
    formattedCitation:
      "Silke, D., Iskander, J., Pan, J., Thompson, A.P., Papenfuss, A.T., Lucet, I.S., Hardy, J.M. ProteinDJ: a high-performance and modular protein design pipeline. Prot Sci (2026).",
    workflows: ["de novo design"],
    tools: ["bindcraft", "rfdiffusion"],
  },
  proteinmpnn: {
    label: "ProteinMPNN",
    title:
      "Robust deep learning-based protein sequence design using ProteinMPNN",
    authors: "Dauparas, J., Anishchenko, I., Bennett, N. et al.",
    firstAuthor: "Dauparas",
    year: "2022",
    doi: "https://doi.org/10.1126/science.add2187",
    formattedCitation:
      "Dauparas, J., Anishchenko, I., Bennett, N. et al. Robust deep learning-based protein sequence design using ProteinMPNN. Science 378, 49-56 (2022).",
    workflows: ["de novo design"],
    tools: ["bindcraft", "rfdiffusion"],
  },
  rfdiffusion: {
    label: "RFdiffusion",
    title: "De novo design of protein structure and function with RFdiffusion",
    authors: "Watson, J. L., Juergens, D., Bennett, N. R. et al.",
    firstAuthor: "Watson",
    year: "2023",
    doi: "https://doi.org/10.1038/s41586-023-06415-8",
    formattedCitation:
      "Watson, J.L., Juergens, D., Bennett, N.R. et al. De novo design of protein structure and function with RFdiffusion. Nature 620, 1089–1100 (2023).",
    workflows: ["de novo design"],
    tools: ["rfdiffusion"],
  },
} satisfies Record<string, Citation>;

export const WORKFLOW_PAPER_CITATION_KEYS_BY_WORKFLOW: Record<
  string,
  CitationKey[]
> = {
  "bulk prediction": ["boltz2", "colabfold"],
  "de novo design": [
    "proteindj",
    "rfdiffusion",
    "bindcraft",
    "proteinmpnn",
    "openmm",
    "alphafold2",
    "alphafold2relax",
  ],
  "interaction screening": ["boltz2", "colabfold"],
  "single prediction": ["colabfold", "alphafold2", "callaway2020", "boltz2"],
  "single structure prediction": [
    "colabfold",
    "alphafold2",
    "callaway2020",
    "boltz2",
  ],
};

function normalizeName(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeKey(value: string | undefined): string {
  return normalizeName(value).replace(/\s+/g, "");
}

function citationEntries(): CitationRecord[] {
  return (Object.keys(CITATIONS) as CitationKey[]).map((key) => ({
    key,
    ...CITATIONS[key],
  }));
}

function buildCitationKeyMap(
  field: "tools" | "workflows"
): Record<string, CitationKey[]> {
  return citationEntries().reduce<Record<string, CitationKey[]>>(
    (acc, citation) => {
      for (const value of citation[field]) {
        const key = normalizeName(value);
        acc[key] = [...(acc[key] ?? []), citation.key];
      }
      return acc;
    },
    {}
  );
}

function uniqueCitations(keys: readonly CitationKey[]): CitationRecord[] {
  const seen = new Set<CitationKey>();
  return keys
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((key) => ({ key, ...CITATIONS[key] }));
}

export const CITATION_KEYS_BY_TOOL = buildCitationKeyMap("tools");
export const CITATION_KEYS_BY_WORKFLOW = buildCitationKeyMap("workflows");

export function getCitation(key: string | undefined): CitationRecord | null {
  const normalized = normalizeKey(key);
  const citationKey = (Object.keys(CITATIONS) as CitationKey[]).find(
    (candidate) => normalizeKey(candidate) === normalized
  );
  return citationKey ? { key: citationKey, ...CITATIONS[citationKey] } : null;
}

export function getCitations(keys: readonly string[]): CitationRecord[] {
  return keys
    .map((key) => getCitation(key))
    .filter((citation): citation is CitationRecord => citation !== null);
}

export function getWorkflowPaperCitationKeys(
  workflow: string | undefined
): readonly CitationKey[] {
  return (
    WORKFLOW_PAPER_CITATION_KEYS_BY_WORKFLOW[normalizeName(workflow)] ?? []
  );
}

export function getWorkflowPaperCitations(
  workflow: string | undefined
): CitationRecord[] {
  return getCitations(getWorkflowPaperCitationKeys(workflow));
}

export function getCitationsByTool(tool: string | undefined): CitationRecord[] {
  const keys = CITATION_KEYS_BY_TOOL[normalizeName(tool)] ?? [];
  const primaryKey = normalizeKey(tool);
  return uniqueCitations([
    ...keys.filter((key) => normalizeKey(key) === primaryKey),
    ...keys.filter((key) => normalizeKey(key) !== primaryKey),
  ]);
}

export function getCitationsByWorkflow(
  workflow: string | undefined
): CitationRecord[] {
  return uniqueCitations(
    CITATION_KEYS_BY_WORKFLOW[normalizeName(workflow)] ?? []
  );
}

export function getRelevantCitations(options: {
  workflow?: string;
  tools?: readonly string[];
}): CitationRecord[] {
  const workflowKeys =
    CITATION_KEYS_BY_WORKFLOW[normalizeName(options.workflow)] ?? [];
  const toolKeys = (options.tools ?? []).flatMap(
    (tool) => CITATION_KEYS_BY_TOOL[normalizeName(tool)] ?? []
  );
  return uniqueCitations([...workflowKeys, ...toolKeys]);
}

export function formatCitation(citation: Citation): string {
  return citation.formattedCitation;
}

export function formatCitationLinkLabel(citation: Citation): string {
  return `${citation.firstAuthor}, ${citation.year}`;
}

export function getCitationHref(citation: Citation): string {
  return citation.doi;
}
