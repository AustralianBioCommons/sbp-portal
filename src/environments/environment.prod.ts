import { Environment } from "./environment";

export const environment: Environment = {
  production: true,
  auth: {
    domain: "dev.login.aai.test.biocommons.org.au",
    clientId: "VgTSGK8Ph92r8mVhmVvQDrxGzbWX0vCm",
    audience: "https://dev.api.aai.test.biocommons.org.au",
  },
  apiBaseUrl: "https://dev.sbp.test.biocommons.org.au/api",
  profileUrl: "https://dev.portal.aai.test.biocommons.org.au/profile",
};
