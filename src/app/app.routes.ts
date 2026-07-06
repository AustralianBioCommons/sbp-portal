import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", redirectTo: "/binder-design", pathMatch: "full" },
  {
    path: "binder-design",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/themes/binder-design/binder-design").then(
            (m) => m.BinderDesignComponent
          ),
      },
      {
        path: "de-novo-design",
        loadComponent: () =>
          import("./features/workflows/de-novo-design/de-novo-design"),
      },
    ],
  },
  {
    path: "structure-prediction",
    children: [
      {
        path: "",
        loadComponent: () =>
          import(
            "./features/themes/structure-prediction/structure-prediction"
          ).then((m) => m.StructurePredictionComponent),
      },
      {
        path: "single-prediction",
        loadComponent: () =>
          import("./features/workflows/single-prediction/single-prediction"),
      },
      {
        path: "bulk-prediction",
        loadComponent: () =>
          import("./features/workflows/bulk-prediction/bulk-prediction"),
      },
      {
        path: "interaction-screening",
        loadComponent: () =>
          import(
            "./features/workflows/interaction-screening/interaction-screening"
          ),
      },
    ],
  },
  {
    path: "jobs",
    children: [
      {
        path: "",
        loadComponent: () => import("./features/jobs/jobs-list/jobs-list"),
      },
      {
        path: ":id",
        loadComponent: () => import("./features/jobs/job-details/job-details"),
      },
    ],
  },
  {
    path: "**",
    loadComponent: () => import("./features/not-found/not-found"),
  },
];
