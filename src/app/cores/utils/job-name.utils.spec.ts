import { FormControl } from "@angular/forms";
import { JOB_NAME_VALIDATORS, jobNameErrorMessage } from "./job-name.utils";

function validate(value: string) {
  return new FormControl(value, JOB_NAME_VALIDATORS).errors;
}

describe("JOB_NAME_VALIDATORS", () => {
  describe("required", () => {
    it("fails for empty string", () => {
      expect(validate("")?.["required"]).toBeTrue();
    });

    it("passes for a non-empty value", () => {
      expect(validate("my-job")?.["required"]).toBeFalsy();
    });
  });

  describe("maxlength", () => {
    it("passes for exactly 60 characters", () => {
      expect(validate("a".repeat(60))?.["maxlength"]).toBeFalsy();
    });

    it("fails for 61 characters", () => {
      expect(validate("a".repeat(61))?.["maxlength"]).toBeTruthy();
    });
  });

  describe("pattern", () => {
    it("passes for letters, numbers, and hyphens", () => {
      expect(validate("my-job-123")?.["pattern"]).toBeFalsy();
    });

    it("passes for letters, numbers, and underscores", () => {
      expect(validate("my_job_123")?.["pattern"]).toBeFalsy();
    });

    it("fails when starting with a digit", () => {
      expect(validate("1invalid")?.["pattern"]).toBeTruthy();
    });

    it("fails for special characters", () => {
      expect(validate("bad name!")?.["pattern"]).toBeTruthy();
    });

    it("fails for whitespace-only", () => {
      expect(validate("   ")?.["pattern"]).toBeTruthy();
    });
  });
});

describe("jobNameErrorMessage", () => {
  it("returns empty string for null errors", () => {
    expect(jobNameErrorMessage(null)).toBe("");
  });

  it("returns required message", () => {
    expect(jobNameErrorMessage({ required: true })).toBe(
      "Job Name is required."
    );
  });

  it("returns maxlength message", () => {
    expect(
      jobNameErrorMessage({
        maxlength: { requiredLength: 60, actualLength: 61 },
      })
    ).toBe("Job Name must be 60 characters or fewer.");
  });

  it("returns pattern message", () => {
    expect(
      jobNameErrorMessage({ pattern: { requiredPattern: "", actualValue: "" } })
    ).toBe(
      "Job Name may only contain letters, numbers, hyphens, and underscores, and must not start with a number."
    );
  });

  it("returns empty string for unrecognised error keys", () => {
    expect(jobNameErrorMessage({ unknown: true })).toBe("");
  });
});
