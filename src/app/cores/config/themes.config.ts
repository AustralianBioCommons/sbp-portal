export interface WorkflowItem {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
}

export interface ToolItem {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
}

export interface ThemeConfig {
  id: string;
  label: string;
  workflows: WorkflowItem[];
  tools: ToolItem[];
}

export const THEMES: ThemeConfig[] = [
  {
    id: "binder-design",
    label: "Binder Design",
    workflows: [
      {
        id: "de-novo-design",
        label: "De Novo Design",
        href: "/binder-design/de-novo-design",
      },
    ],
    tools: [
      {
        id: "bindcraft",
        label: "BindCraft",
        href: "/binder-design/de-novo-design",
      },
      {
        id: "rfdiffusion",
        label: "RFdiffusion",
        href: "/tools/rfdiffusion",
        disabled: true,
      },
      {
        id: "boltzgen",
        label: "BoltzGen",
        href: "/tools/boltzgen",
        disabled: true,
      },
    ],
  },
  {
    id: "structure-prediction",
    label: "Structure Prediction",
    workflows: [
      {
        id: "single-structure-prediction",
        label: "Single Prediction",
        href: "/structure-prediction/single-structure-prediction",
      },
      {
        id: "bulk-prediction",
        label: "Bulk Prediction",
        href: "/structure-prediction/bulk-prediction",
      },
      {
        id: "interaction-screening",
        label: "Interaction Screening",
        href: "/structure-prediction/interaction-screening",
      },
    ],
    tools: [
      {
        id: "boltz",
        label: "Boltz",
        href: "/structure-prediction/single-structure-prediction",
      },
      {
        id: "colabfold",
        label: "ColabFold",
        href: "/structure-prediction/single-structure-prediction",
      },
      {
        id: "alphafold2",
        label: "AlphaFold2",
        href: "/structure-prediction/single-structure-prediction",
      },
    ],
  },
];
