// Dev fallback values — override by running `npm run env:generate` with a .env file.
// In CI, run `npm run env:generate` (or `env:generate:prod`) after fetching the
// Secrets Manager secret before invoking `ng build`.
export interface Environment {
  production: boolean;
  auth: {
    domain: string;
    clientId: string;
    audience?: string;
  };
  apiBaseUrl?: string;
  profileUrl: string;
  /** Dev-only: simulates a logged-in user who lacks the workflow execution role. Remove before shipping. */
  devPreviewAuthenticatedNoRole?: boolean;
}

export const environment: Environment = {
  production: false,
  auth: {
    domain: "dev.login.aai.test.biocommons.org.au",
    clientId: "VgTSGK8Ph92r8mVhmVvQDrxGzbWX0vCm",
    audience: "https://dev.api.aai.test.biocommons.org.au",
  },
  apiBaseUrl: "https://api.dev.sbp.test.biocommons.org.au",
  // For local-only testing, prefer an Angular dev-server proxy or a gitignored environment.local.ts
  profileUrl: "https://dev.portal.aai.test.biocommons.org.au/profile",
};
