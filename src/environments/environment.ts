import { Environment } from "./environment.interface";
import {
  RuntimeEnvironmentConfig,
  mergeEnvironmentConfig,
} from "./runtime-config";

const defaults: Environment = {
  production: false,
  auth: {
    domain: "dev.login.aai.test.biocommons.org.au",
    clientId: "VgTSGK8Ph92r8mVhmVvQDrxGzbWX0vCm",
    audience: "https://dev.api.aai.test.biocommons.org.au",
  },
  apiBaseUrl: "https://api.dev.sbp.test.biocommons.org.au",
  profileUrl: "https://dev.portal.aai.test.biocommons.org.au/profile",
  rolesClaim: "https://biocommons.org.au/roles",
  workflowRole: "biocommons/group/sbp_workflow_execution",
};

export const environment: Environment = mergeEnvironmentConfig(defaults);

export function updateEnvironment(runtime?: RuntimeEnvironmentConfig): void {
  Object.assign(environment, mergeEnvironmentConfig(defaults, runtime));
}

export const environmentDefaults = defaults;
