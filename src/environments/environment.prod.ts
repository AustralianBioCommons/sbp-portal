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
  Object.assign(environment, mergeEnvironmentConfig(defaults, runtime));
}

export const environmentDefaults = defaults;
