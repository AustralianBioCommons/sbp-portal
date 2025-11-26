import { CommonModule } from "@angular/common";
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  Signal,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import { filter, Subscription, take } from "rxjs";
import { ButtonComponent } from "../../../components/button/button.component";
import { DialogComponent } from "../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../components/loading/loading.component";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
import { FormFieldComponent } from "../../../components/workflow/form-field/form-field.component";
import { FormStatusComponent } from "../../../components/workflow/form-status/form-status.component";
import { StepContentComponent } from "../../../components/workflow/step-content/step-content.component";
import {
  Step,
  StepNavigationComponent,
} from "../../../components/workflow/step-navigation/step-navigation.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../../../components/workflow/tool-selection/tool-selection.component";
import { AuthService } from "../../../cores/services/auth.service";
import { SchemaLoaderService } from "../../../cores/services/schema-loader.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";

interface TabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

interface ToolChip extends ToolOption {
  id: "bindcraft" | "boltzgen" | "rfdiffusion";
}

type StepItem = Step;

@Component({
  selector: "app-de-novo-design",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    DialogComponent,
    LoadingComponent,
    ToolSelectionComponent,
    StepNavigationComponent,
    StepContentComponent,
    FormFieldComponent,
    ConfigurationSummaryComponent,
    FormStatusComponent,
  ],
  host: {
    class: "block w-full de-novo-design-bg",
  },
  templateUrl: "./de-novo-design.html",
  styleUrls: ["./de-novo-design.scss"],
})
export class DeNovoDesignComponent implements OnInit, OnDestroy {
  // // Make Object available in template
  Object = Object;

  // Auth
  public auth = inject(AuthService);
  // Router for navigation
  private router = inject(Router);
  // Schema loader service
  public schemaLoader = inject(SchemaLoaderService);
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);

  // Schema URLs for bindflow workflow
  private readonly inputSchemaUrl =
    "https://raw.githubusercontent.com/Australian-Structural-Biology-Computing/bindflow/refs/heads/main/assets/schema_input.json";

  // Form data and validation
  formData = signal<Record<string, unknown>>({});
  formErrors = signal<{ [key: string]: string }>({});
  isFormValid = signal<boolean>(false);
  // Tabs
  readonly tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "output", label: "Output" },
    { id: "papers", label: "Papers" },
  ];
  activeTab = signal<TabItem["id"]>("overview");
  isActiveTab = (id: TabItem["id"]) => this.activeTab() === id;
  switchTab(id: TabItem["id"]) {
    this.activeTab.set(id);
  }

  // Tools
  readonly tools: ToolChip[] = [
    {
      id: "boltzgen",
      label: "BoltzGen",
    },
    {
      id: "rfdiffusion",
      label: "RFDiffusion",
    },
    {
      id: "bindcraft",
      label: "BindCraft",
    },
  ];
  selectedTool = signal<ToolChip["id"]>("bindcraft");
  isToolSelected = (id: ToolChip["id"]) => this.selectedTool() === id;
  selectTool(id: ToolChip["id"]) {
    this.selectedTool.set(id);
  }
  selectedToolLabel: Signal<string> = computed(
    () => this.tools.find((t) => t.id === this.selectedTool())?.label ?? ""
  );
  selectedToolData: Signal<ToolChip | undefined> = computed(() =>
    this.tools.find((t) => t.id === this.selectedTool())
  );

  // Tool-specific parameter definitions (no params for any tool yet)
  readonly toolParams: Record<
    ToolChip["id"],
    { name: string; label: string; description?: string }[]
  > = {
    boltzgen: [],
    rfdiffusion: [],
    bindcraft: [],
  };

  // Computed signal to indicate whether the currently selected tool exposes parameters
  selectedToolHasParams = computed(() => {
    const params = this.toolParams[this.selectedTool()];
    return Array.isArray(params) && params.length > 0;
  });

  // Step data inputs
  // Step 1: Input configuration
  inputSequence = signal<string>("");
  inputFileName = signal<string>("");

  // Steps marked complete only when user presses Next on that step
  completedSteps = signal<number[]>([]);

  // Check if a step has validation errors
  isStepInvalid = (id: number) => {
    if (id === 1) {
      // Step 1 is invalid if form is not valid
      return !this.isFormValid();
    }
    return false;
  };

  // Track if user has attempted to complete step 1
  private attemptedStep1 = signal<boolean>(false);
  hasAttemptedStep1 = () => this.attemptedStep1();

  isStepComplete = (id: number) => {
    // Step 2 is automatically completed if the selected tool has no parameters
    if (id === 2 && !this.selectedToolHasParams()) {
      return true;
    }
    return this.completedSteps().includes(id);
  };

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.inputFileName.set(file ? file.name : "");
  }

  // Stepper
  readonly steps: StepItem[] = [
    {
      id: 1,
      title: "Input Configuration",
      description: "Provide sequence or structure inputs",
    },
    {
      id: 2,
      title: "Tool Settings",
      description: "Configure parameters specific to the selected tool",
    },
    {
      id: 3,
      title: "Review & Submit",
      description: "Review all settings and run the job",
    },
  ];
  currentStep = signal<number>(1);
  canGoPrev: Signal<boolean> = computed(() => this.currentStep() > 1);
  canGoNext: Signal<boolean> = computed(() => {
    if (this.currentStep() < this.steps.length) {
      // If on step 1, check if form is valid
      if (this.currentStep() === 1) {
        return this.isFormValid();
      }
      return true;
    }
    return false;
  });

  previousStep() {
    if (this.currentStep() > 1) this.currentStep.update((v) => v - 1);
  }
  nextStep() {
    if (this.currentStep() < this.steps.length) {
      const current = this.currentStep();

      // Validate current step before proceeding
      if (current === 1) {
        // Mark that user has attempted step 1
        this.attemptedStep1.set(true);

        // Validate all required fields to show specific errors
        this.validateAllRequiredFields();
        this.validateForm();

        // Check if form is valid
        if (!this.isFormValid()) {
          // Don't proceed if validation fails
          console.log("Cannot proceed: Input configuration validation failed");
          return;
        }
      }

      this.completedSteps.update((arr) =>
        arr.includes(current) ? arr : [...arr, current]
      );
      this.currentStep.update((v) => v + 1);
    }
  }
  goToStep(step: number) {
    if (step >= 1 && step <= this.steps.length) {
      this.currentStep.set(step);
    }
  }

  constructor() {
    console.log("DeNovoDesignComponent constructor called");

    // Ensure all signals are properly initialized
    this.formData.set({});
    this.formErrors.set({});
    this.isFormValid.set(false);
  }

  private subscription = new Subscription();

  ngOnInit() {
    console.log("NovoDesignComponent ngOnInit called");
    console.log("Navigation context:", {
      currentUrl: window.location.href,
      timestamp: new Date().toISOString(),
    });
    console.log("Services status:", {
      authService: !!this.auth,
      schemaLoader: !!this.schemaLoader,
    });

    // Wait for Auth0 to initialize before making HTTP requests
    // Use take(1) and filter to only react once when loading is complete
    this.subscription.add(
      this.auth.isLoading$
        .pipe(
          filter((isLoading) => !isLoading),
          take(1)
        )
        .subscribe(() => {
          console.log("Auth service ready, starting schema load...");
          this.loadInputSchema();
        })
    );

    // Fallback: If auth doesn't initialize within 5 seconds, load anyway
    setTimeout(() => {
      if (!this.schemaLoader.inputSchemaData()) {
        console.log("Fallback: Loading schema without waiting for auth...");
        this.loadInputSchema();
      }
    }, 5000);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadInputSchema() {
    this.schemaLoader.loadInputSchema(
      this.inputSchemaUrl,
      (parsedSchema) => {
        // Success callback: initialize form data
        const defaultValues = this.schemaLoader.generateDefaultValues();
        this.initializeFormData(defaultValues);

        // Initialize table with one default row
        this.schemaLoader.initializeDefaultRow(() => {
          // After row is created, sync to form data
          this.syncRowsToFormData();
          this.validateAllRows();
        });
      },
      (error) => {
        console.error("Failed to load schema:", error);
      }
    );
  }

  submitWorkflow() {
    if (!this.isFormValid()) {
      console.error("Cannot submit: Form validation failed");
      return;
    }

    const formData = this.getFormData();
    this.workflowSubmission.submitWorkflow(formData);
  }

  // Navigate to home page (delegates to service)
  goToHome() {
    this.workflowSubmission.goToHome();
  }

  // Navigate to jobs page (delegates to service)
  goToJobs() {
    this.workflowSubmission.goToJobs();
  }

  // Login with return URL to come back to this page
  loginWithReturnUrl() {
    const currentUrl = window.location.pathname + window.location.search;
    this.auth.login(currentUrl);
  }

  // Initialize form data with default values from schema
  private initializeFormData(defaultValues: Record<string, unknown>): void {
    this.formData.set(defaultValues);
    this.validateForm();
  }

  // Update form data for a specific field
  updateFieldValue(fieldName: string, value: unknown): void {
    const currentData = this.formData();
    const updatedData = { ...currentData, [fieldName]: value };
    this.formData.set(updatedData);
    this.validateField(fieldName, value);
    this.validateForm();
  }

  // Handle input events
  onInputChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateFieldValue(fieldName, target.value);
  }

  // Handle number input events
  onNumberChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value ? parseInt(target.value, 10) : null;
    this.updateFieldValue(fieldName, value);
  }

  // Handle select change events
  onSelectChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFieldValue(fieldName, target.value);
  }

  // Handle boolean select change events
  onBooleanChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFieldValue(fieldName, target.value === "true");
  }

  // Handle file input events
  onFileChange(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    this.updateFieldValue(fieldName, file);
  }

  // Validate a single field
  private validateField(fieldName: string, value: unknown): void {
    const currentErrors = this.formErrors();
    const field = this.schemaLoader
      .inputSchemaFields()
      .find((f) => f.name === fieldName);

    if (!field) {
      return;
    }

    const validationResult = this.schemaLoader[
      "inputSchemaService"
    ].validateFieldValue(field, value);

    if (validationResult.valid) {
      // Remove the error for this field
      const updatedErrors = { ...currentErrors };
      delete updatedErrors[fieldName];
      this.formErrors.set(updatedErrors);
    } else {
      this.formErrors.set({
        ...currentErrors,
        [fieldName]: validationResult.errors[0] || "Invalid value",
      });
    }
  }

  // Public method for template to validate single field (called on blur events)
  validateSingleField(fieldName: string): void {
    const currentData = this.formData();
    const value = currentData[fieldName];
    this.validateField(fieldName, value);
    this.validateForm(); // Re-validate entire form after single field validation
  }

  // Validate all required fields and show errors
  private validateAllRequiredFields(): void {
    const requiredFields = this.schemaLoader.requiredInputFields();
    const currentData = this.formData();

    // Validate each required field to show specific errors
    for (const field of requiredFields) {
      const value = currentData[field.name];
      this.validateField(field.name, value);
    }
  }

  // Validate the entire form
  private validateForm(): void {
    const requiredFields = this.schemaLoader.requiredInputFields();
    const currentData = this.formData();

    let isValid = true;

    // Check if all required fields have values
    for (const field of requiredFields) {
      const value = currentData[field.name];
      if (value === undefined || value === null || value === "") {
        isValid = false;
        break;
      }
    }

    // Check if there are any validation errors
    const errors = this.formErrors();
    if (Object.keys(errors).length > 0) {
      isValid = false;
    }

    this.isFormValid.set(isValid);
  }

  // Get current form data for submission
  getFormData(): Record<string, unknown> {
    return this.formData();
  }

  // Form summary for step 3
  formSummary = computed(() => {
    const data = this.formData();
    const fields = this.schemaLoader.inputSchemaFields();
    const summary: { label: string; value: string; fieldName: string }[] = [];

    fields.forEach((field) => {
      const value = data[field.name];
      if (value !== undefined && value !== null && value !== "") {
        let displayValue = String(value);

        // Format different field types
        if (field.type === "boolean") {
          displayValue = value ? "Yes" : "No";
        } else if (field.type === "number") {
          displayValue = String(value);
        } else if (Array.isArray(value)) {
          displayValue = value.join(", ");
        } else if (typeof value === "object") {
          displayValue = JSON.stringify(value);
        }

        summary.push({
          label: field.label || field.name,
          value: displayValue,
          fieldName: field.name,
        });
      }
    });

    return summary;
  });

  // Get summary of configuration for display
  getConfigurationSummary() {
    return {
      tool: this.selectedToolLabel(),
      hasParameters: this.selectedToolHasParams(),
      totalFields: this.schemaLoader.inputSchemaFields().length,
      filledFields: this.formSummary().length,
      requiredFields: this.schemaLoader.requiredInputFields().length,
    };
  }

  // Reset form to default values
  resetForm(): void {
    const defaultValues = this.schemaLoader.generateDefaultValues();
    if (Object.keys(defaultValues).length > 0) {
      this.initializeFormData(defaultValues);
    }
  }

  // Sync all row data to formData for validation system
  private syncRowsToFormData(): void {
    const rowValues = this.schemaLoader.getFirstRowValues();
    if (Object.keys(rowValues).length > 0) {
      this.formData.set(rowValues);
      this.validateForm();
    }
  }

  // Update row value (single row only)
  updateRowValue(rowId: string, fieldName: string, value: unknown): void {
    this.schemaLoader.updateRowValue(rowId, fieldName, value);
    // Sync row data to formData for validation
    this.syncRowsToFormData();
  }

  // Get value for a specific row and field
  getRowValue(rowId: string, fieldName: string): unknown {
    return this.schemaLoader.getRowValue(rowId, fieldName);
  }

  // Row-level validation methods
  validateRowField(rowId: string, fieldName: string): void {
    const value = this.getRowValue(rowId, fieldName);
    const field = this.schemaLoader
      .inputSchemaFields()
      .find((f) => f.name === fieldName);

    if (!field) return;

    const validationResult = this.schemaLoader[
      "inputSchemaService"
    ].validateFieldValue(field, value);
    const errorKey = `${rowId}_${fieldName}`;
    const currentErrors = this.formErrors();

    if (validationResult.valid) {
      // Remove error for this specific cell
      const updatedErrors = { ...currentErrors };
      delete updatedErrors[errorKey];
      this.formErrors.set(updatedErrors);
    } else {
      // Add error for this specific cell
      this.formErrors.set({
        ...currentErrors,
        [errorKey]: validationResult.errors[0] || "Invalid value",
      });
    }

    this.validateAllRows();
  }

  // Validate all rows and update overall form validity
  validateAllRows(): void {
    const rows = this.schemaLoader.inputRows();
    const requiredFields = this.schemaLoader.requiredInputFields();
    let hasErrors = false;

    // Check each row for required field completeness
    for (const row of rows) {
      for (const field of requiredFields) {
        const value = row.values[field.name];
        if (value === undefined || value === null || value === "") {
          hasErrors = true;
          break;
        }
      }
      if (hasErrors) break;
    }

    // Check if there are validation errors
    const errors = this.formErrors();
    if (Object.keys(errors).length > 0) {
      hasErrors = true;
    }

    this.isFormValid.set(!hasErrors && rows.length > 0);
  }

  // Get validation error for a specific cell
  getRowFieldError(rowId: string, fieldName: string): string | null {
    const errorKey = `${rowId}_${fieldName}`;
    return this.formErrors()[errorKey] || null;
  }

  // Check if a specific cell has an error
  hasRowFieldError(rowId: string, fieldName: string): boolean {
    return this.getRowFieldError(rowId, fieldName) !== null;
  }

  // Update row value with validation
  updateRowValueWithValidation(
    rowId: string,
    fieldName: string,
    value: unknown
  ): void {
    this.updateRowValue(rowId, fieldName, value);
    this.validateRowField(rowId, fieldName);
  }

  // Get overall form validation status
  getFormValidationSummary(): {
    valid: boolean;
    errorCount: number;
    rowCount: number;
  } {
    const errors = this.formErrors();
    const rows = this.schemaLoader.inputRows();

    return {
      valid: this.isFormValid(),
      errorCount: Object.keys(errors).length,
      rowCount: rows.length,
    };
  }
}
