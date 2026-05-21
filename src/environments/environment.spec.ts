import {
  environment,
  environmentDefaults,
  updateEnvironment,
} from "./environment";

describe("environment", () => {
  afterEach(() => {
    updateEnvironment();
  });

  it("exports defaults matching environmentDefaults", () => {
    expect(environment.production).toBe(environmentDefaults.production);
    expect(environment.auth).toEqual(environmentDefaults.auth);
    expect(environment.apiBaseUrl).toBe(environmentDefaults.apiBaseUrl);
    expect(environment.profileUrl).toBe(environmentDefaults.profileUrl);
    expect(environment.rolesClaim).toBe(environmentDefaults.rolesClaim);
    expect(environment.workflowRole).toBe(environmentDefaults.workflowRole);
  });

  describe("updateEnvironment", () => {
    it("overrides all fields from runtime config", () => {
      updateEnvironment({
        production: true,
        auth: {
          domain: "staging.login.example.com",
          clientId: "staging-client",
        },
        apiBaseUrl: "https://api.staging.example.com",
        profileUrl: "https://staging.portal.example.com/profile",
        rolesClaim: "https://example.com/roles",
        workflowRole: "example/group/workflow",
      });

      expect(environment.production).toBe(true);
      expect(environment.auth.domain).toBe("staging.login.example.com");
      expect(environment.auth.clientId).toBe("staging-client");
      expect(environment.apiBaseUrl).toBe("https://api.staging.example.com");
      expect(environment.profileUrl).toBe(
        "https://staging.portal.example.com/profile"
      );
      expect(environment.rolesClaim).toBe("https://example.com/roles");
      expect(environment.workflowRole).toBe("example/group/workflow");
    });

    it("merges partial auth override while keeping unspecified auth fields", () => {
      updateEnvironment({ auth: { domain: "other.login.example.com" } });

      expect(environment.auth.domain).toBe("other.login.example.com");
      expect(environment.auth.clientId).toBe(environmentDefaults.auth.clientId);
    });

    it("restores defaults when called with no argument", () => {
      updateEnvironment({
        production: true,
        apiBaseUrl: "https://other.example.com",
      });
      updateEnvironment();

      expect(environment.production).toBe(environmentDefaults.production);
      expect(environment.apiBaseUrl).toBe(environmentDefaults.apiBaseUrl);
    });
  });
});
