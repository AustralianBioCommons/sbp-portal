export interface ToolItem {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
}

export interface WorkflowItem {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
  tools: ToolItem[];
}

export interface ThemeConfig {
  id: string;
  label: string;
  workflows: WorkflowItem[];
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
        tools: [
          {
            id: "bindcraft",
            label: "BindCraft",
            href: "/binder-design/de-novo-design",
          },
          {
            id: "rfdiffusion",
            label: "RFdiffusion",
            href: "/binder-design/de-novo-design",
          },
        ],
      },
      {
        id: "partial-diffusion",
        label: "Partial Diffusion",
        href: "/binder-design/partial-diffusion",
        disabled: true,
        tools: [
          {
            id: "rfdiffusion",
            label: "RFdiffusion",
            href: "/binder-design/partial-diffusion",
            disabled: true,
          },
        ],
      },
      {
        id: "motif-scaffolding",
        label: "Motif Scaffolding",
        href: "/binder-design/motif-scaffolding",
        disabled: true,
        tools: [
          {
            id: "rfdiffusion",
            label: "RFdiffusion",
            href: "/binder-design/motif-scaffolding",
            disabled: true,
          },
        ],
      },
    ],
  },
  {
    id: "structure-prediction",
    label: "Structure Prediction",
    workflows: [
      {
        id: "single-prediction",
        label: "Single Prediction",
        href: "/structure-prediction/single-prediction",
        tools: [
          {
            id: "colabfold",
            label: "ColabFold",
            href: "/structure-prediction/single-prediction",
          },
          {
            id: "alphafold2",
            label: "AlphaFold2",
            href: "/structure-prediction/single-prediction",
          },
          {
            id: "boltz",
            label: "Boltz",
            href: "/structure-prediction/single-prediction",
          },
        ],
      },
      {
        id: "bulk-prediction",
        label: "Bulk Prediction",
        href: "/structure-prediction/bulk-prediction",
        tools: [
          {
            id: "boltz",
            label: "Boltz",
            href: "/structure-prediction/bulk-prediction",
          },
          {
            id: "colabfold",
            label: "ColabFold",
            href: "/structure-prediction/bulk-prediction",
          },
        ],
      },
      {
        id: "interaction-screening",
        label: "Interaction Screening",
        href: "/structure-prediction/interaction-screening",
        tools: [
          {
            id: "boltz",
            label: "Boltz",
            href: "/structure-prediction/interaction-screening",
          },
          {
            id: "colabfold",
            label: "ColabFold",
            href: "/structure-prediction/interaction-screening",
          },
        ],
      },
    ],
  },
];
