import { Environment } from "./environment.interface";

export interface RuntimeEnvironmentConfig {
  production?: boolean;
  auth?: Partial<Environment["auth"]>;
  apiBaseUrl?: string;
  profileUrl?: string;
  rolesClaim?: string;
  workflowRole?: string;
}

export function mergeEnvironmentConfig(
  defaults: Environment,
  runtime?: RuntimeEnvironmentConfig
): Environment {
  return {
    ...defaults,
    ...(runtime ?? {}),
    auth: {
      ...defaults.auth,
      ...(runtime?.auth ?? {}),
    },
  };
}
