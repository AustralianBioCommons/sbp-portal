import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", redirectTo: "/binder-design", pathMatch: "full" },
  {
    path: "binder-design",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./pages/binder-design/binder-design").then(
            (m) => m.BinderDesignComponent
          ),
      },
      {
        path: "de-novo-design",
        loadComponent: () =>
          import("./pages/workflow/de-novo-design/de-novo-design"),
      },
    ],
  },
  {
    path: "structure-prediction",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./pages/structure-prediction/structure-prediction").then(
            (m) => m.StructurePredictionComponent
          ),
      },
      {
        path: "single-prediction",
        loadComponent: () =>
          import("./pages/workflow/single-prediction/single-prediction"),
      },
      {
        path: "bulk-prediction",
        loadComponent: () =>
          import("./pages/workflow/bulk-prediction/bulk-prediction"),
      },
      {
        path: "interaction-screening",
        loadComponent: () =>
          import(
            "./pages/workflow/interaction-screening/interaction-screening"
          ),
      },
    ],
  },
  {
    path: "jobs",
    children: [
      {
        path: "",
        loadComponent: () => import("./pages/jobs/jobs"),
      },
      {
        path: ":id",
        loadComponent: () => import("./pages/job-details/job-details"),
      },
    ],
  },
  {
    path: "**",
    loadComponent: () => import("./pages/not-found/not-found"),
  },
];
