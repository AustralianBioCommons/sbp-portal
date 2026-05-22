import { Environment } from "./environment.interface";
import {
  RuntimeEnvironmentConfig,
  mergeEnvironmentConfig,
} from "./runtime-config";

const defaults: Environment = {
  production: true,
  auth: {
    domain: "",
    clientId: "",
    audience: "",
  },
  apiBaseUrl: "",
  profileUrl: "",
  rolesClaim: "",
  workflowRole: "",
};

export const environment: Environment = mergeEnvironmentConfig(defaults);

export function updateEnvironment(runtime?: RuntimeEnvironmentConfig): void {
  const merged = mergeEnvironmentConfig(defaults, runtime);
  environment.production = merged.production;
  environment.auth = merged.auth;
  environment.apiBaseUrl = merged.apiBaseUrl;
  environment.profileUrl = merged.profileUrl;
  environment.rolesClaim = merged.rolesClaim;
  environment.workflowRole = merged.workflowRole;
}

export const environmentDefaults = defaults;
