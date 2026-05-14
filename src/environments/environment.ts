export interface Environment {
  production: boolean;
  auth: {
    domain: string;
    clientId: string;
    audience?: string;
  };
  apiBaseUrl?: string;
  profileUrl: string;
}

export const environment: Environment = {
  production: false,
  auth: {
    domain: "dev.login.aai.test.biocommons.org.au",
    clientId: "VgTSGK8Ph92r8mVhmVvQDrxGzbWX0vCm",
    audience: "https://dev.api.aai.test.biocommons.org.au",
  },
  // apiBaseUrl: "https://api.dev.sbp.test.biocommons.org.au",
  apiBaseUrl: "https://localhost:3000",
  // For local-only testing, prefer an Angular dev-server proxy or a gitignored environment.local.ts
  profileUrl: "https://dev.portal.aai.test.biocommons.org.au/profile",
};
