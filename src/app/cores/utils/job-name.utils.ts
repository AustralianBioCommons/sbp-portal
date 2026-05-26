import { ValidationErrors, Validators } from "@angular/forms";

export const JOB_NAME_VALIDATORS = [
  Validators.required,
  Validators.maxLength(60),
  Validators.pattern(/^(?!\d)[\w-]*$/),
];

export function jobNameErrorMessage(errors: ValidationErrors | null): string {
  if (!errors) return "";
  if (errors["required"]) return "Job Name is required.";
  if (errors["maxlength"]) return "Job Name must be 60 characters or fewer.";
  if (errors["pattern"])
    return "Job Name may only contain letters, numbers, hyphens, and underscores, and must not start with a number.";
  return "";
}
