export interface Environment {
  production: boolean;
  auth: {
    domain: string;
    clientId: string;
    audience?: string;
  };
  apiBaseUrl?: string;
}

export const environment: Environment = {
  production: false,
  auth: {
    domain: "dev.login.aai.test.biocommons.org.au",
    clientId: "VgTSGK8Ph92r8mVhmVvQDrxGzbWX0vCm",
    audience: "https://dev.api.aai.test.biocommons.org.au",
  },
};
