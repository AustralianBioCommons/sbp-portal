import { CommonModule } from "@angular/common";
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import {
  Component,
  computed,
  inject,
  Signal,
  signal,
} from "@angular/core";
import { AlertComponent } from "../../../components/alert/alert.component";
import { ButtonComponent } from "../../../components/button/button.component";
import { DialogComponent } from "../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../components/loading/loading.component";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
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
import { AuthService } from "../../../cores/auth.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import {
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence,
} from "../../../cores/utils/fasta.utils";

interface TabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

type MoleculeType = "protein" | "rna" | "dna" | "ligand";
type ToolId = "colabfold" | "alphafold2" | "boltz";
type StepItem = Step;

interface ToolChip extends ToolOption {
  id: ToolId;
}

interface EntityRow {
  id: number;
  sequence: string;
  copyNumber: string;
  moleculeType: MoleculeType;
  touched: {
    sequence: boolean;
    copyNumber: boolean;
    moleculeType: boolean;
  };
}

interface EntityRowErrors {
  sequence?: string;
  copyNumber?: string;
  tool?: string;
}

interface ToolSettingErrors {
  alphafold2RandomSeed?: string;
  colabfoldNumRecycles?: string;
}

@Component({
  selector: "app-single-prediction",
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    AlertComponent,
    ButtonComponent,
    DialogComponent,
    LoadingComponent,
    ToolSelectionComponent,
    StepNavigationComponent,
    StepContentComponent,
    ConfigurationSummaryComponent,
    FormStatusComponent,
  ],
  host: {
    class: "block w-full single-prediction-bg",
  },
  templateUrl: "./single-prediction.html",
  styleUrls: ["./single-prediction.scss"],
})
export class SinglePredictionComponent {
  public auth = inject(AuthService);
  public workflowSubmission = inject(WorkflowSubmissionService);
  private datasetUploadService = inject(DatasetUploadService);

  private nextRowId = 1;

  showAlert = signal(false);
  alertMessage = signal("");

  readonly tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "output", label: "Output" },
    { id: "papers", label: "Papers" },
  ];
  activeTab = signal<TabItem["id"]>("overview");
  isActiveTab = (id: TabItem["id"]) => this.activeTab() === id;

  readonly tools: ToolChip[] = [
    { id: "colabfold", label: "ColabFold" },
    { id: "alphafold2", label: "AlphaFold2" },
    { id: "boltz", label: "Boltz" },
  ];
  selectedTool = signal<ToolId>("colabfold");
  selectedToolLabel: Signal<string> = computed(
    () => this.tools.find((tool) => tool.id === this.selectedTool())?.label ?? ""
  );

  readonly moleculeTypes: { value: MoleculeType; label: string }[] = [
    { value: "protein", label: "Protein" },
    { value: "rna", label: "RNA" },
    { value: "dna", label: "DNA" },
    { value: "ligand", label: "Ligand" },
  ];

  entityRows = signal<EntityRow[]>([this.createEntityRow()]);
  stepOneTouched = signal(false);
  stepTwoTouched = signal(false);

  alphafold2RandomSeed = signal("42");
  alphafold2FullDbs = signal(false);
  colabfoldNumRecycles = signal("3");
  colabfoldUseTemplates = signal(true);
  boltzUsePotentials = signal(false);
  alphafold2RandomSeedTouched = signal(false);
  colabfoldNumRecyclesTouched = signal(false);

  readonly steps: StepItem[] = [
    {
      id: 1,
      title: "Input Configuration",
      description: "Define one or more entities with sequence, copies, and molecule type",
    },
    {
      id: 2,
      title: "Tool Settings",
      description: "Configure only the settings required by the selected tool",
    },
    {
      id: 3,
      title: "Review & Submit",
      description: "Review entities, settings, and generated FASTA content before submission",
    },
  ];
  currentStep = signal<number>(1);
  completedSteps = signal<number[]>([]);

  readonly entityValidationResults = computed(() =>
    this.entityRows().map((row) => this.validateEntityRow(row))
  );
  readonly toolSettingErrors = computed(() => this.validateToolSettings());
  readonly isStep1Valid = computed(
    () =>
      this.entityRows().length > 0 &&
      this.entityValidationResults().every(
        (errors) => !errors.sequence && !errors.copyNumber && !errors.tool
      )
  );
  readonly isStep2Valid = computed(
    () => Object.keys(this.toolSettingErrors()).length === 0
  );
  readonly isFormValid = computed(
    () => this.isStep1Valid() && this.isStep2Valid()
  );

  canGoPrev: Signal<boolean> = computed(() => this.currentStep() > 1);
  canGoNext: Signal<boolean> = computed(() => {
    if (this.currentStep() === 1) {
      return this.isStep1Valid();
    }
    if (this.currentStep() === 2) {
      return this.isStep2Valid();
    }
    return false;
  });

  readonly canSubmit = computed(() => this.isFormValid());

  readonly formSummary = computed(() => {
    const entityItems = this.entityRows().map((row, index) => ({
      label: `Entity ${index + 1}`,
      value: `${this.getMoleculeTypeLabel(row.moleculeType)} x${this.getParsedCopyNumber(row.copyNumber)} • ${this.getNormalizedSequence(row)}`,
      fieldName: `entity_${row.id}`,
    }));

    const settingItems = this.getToolSettingsSummaryItems();

    return [...entityItems, ...settingItems];
  });

  readonly generatedFastaContent = computed(() => {
    if (!this.isStep1Valid()) {
      return "";
    }

    return this.entityRows()
      .flatMap((row, index) => {
        const copies = this.getParsedCopyNumber(row.copyNumber);
        const sequence = this.getNormalizedSequence(row);
        return Array.from({ length: copies }, (_, copyIndex) => [
          `>entity_${index + 1}_copy_${copyIndex + 1}|${row.moleculeType}`,
          sequence,
        ].join("\n"));
      })
      .join("\n");
  });

  switchTab(id: TabItem["id"]) {
    this.activeTab.set(id);
  }

  selectTool(id: string) {
    this.selectedTool.set(id as ToolId);
  }

  addEntityRow(): void {
    this.entityRows.update((rows) => [...rows, this.createEntityRow()]);
  }

  dropEntityRow(event: CdkDragDrop<EntityRow[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.entityRows.update((rows) => {
      const nextRows = [...rows];
      moveItemInArray(nextRows, event.previousIndex, event.currentIndex);
      return nextRows;
    });
  }

  removeEntityRow(id: number): void {
    this.entityRows.update((rows) => {
      if (rows.length === 1) {
        return rows;
      }
      return rows.filter((row) => row.id !== id);
    });
  }

  updateRowSequence(id: number, value: string): void {
    this.patchRow(id, { sequence: value });
  }

  updateRowCopyNumber(id: number, value: string): void {
    this.patchRow(id, { copyNumber: value });
  }

  updateRowMoleculeType(id: number, value: string): void {
    this.patchRow(id, { moleculeType: value as MoleculeType });
  }

  isStepInvalid = (id: number) => {
    if (id === 1) {
      return !this.isStep1Valid();
    }
    if (id === 2) {
      return !this.isStep2Valid();
    }
    return false;
  };

  isStepComplete = (id: number) => {
    if (id === 1) {
      return this.isStep1Valid() && (this.completedSteps().includes(1) || this.currentStep() > 1);
    }
    if (id === 2) {
      return this.isStep2Valid() && (this.completedSteps().includes(2) || this.currentStep() > 2);
    }
    return this.completedSteps().includes(id);
  };

  touchRowField(id: number, field: keyof EntityRow["touched"]): void {
    this.entityRows.update((rows) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, touched: { ...row.touched, [field]: true } }
          : row
      )
    );
  }

  getRowErrors(index: number): EntityRowErrors {
    return this.entityValidationResults()[index] ?? {};
  }

  shouldShowRowFieldError(row: EntityRow, field: keyof EntityRow["touched"]): boolean {
    return this.stepOneTouched() || row.touched[field];
  }

  shouldShowRowToolError(row: EntityRow): boolean {
    return (
      this.stepOneTouched() ||
      row.touched.sequence ||
      row.touched.copyNumber ||
      row.touched.moleculeType
    );
  }

  getToolSettingsSummaryItems(): {
    label: string;
    value: string;
    fieldName: string;
  }[] {
    switch (this.selectedTool()) {
      case "alphafold2":
        return [
          {
            label: "alphafold2_random_seed",
            value: this.alphafold2RandomSeed(),
            fieldName: "alphafold2_random_seed",
          },
          {
            label: "alphafold2_full_dbs",
            value: this.alphafold2FullDbs() ? "true" : "false",
            fieldName: "alphafold2_full_dbs",
          },
        ];
      case "colabfold":
        return [
          {
            label: "colabfold_num_recycles",
            value: this.colabfoldNumRecycles(),
            fieldName: "colabfold_num_recycles",
          },
          {
            label: "colabfold_use_templates",
            value: this.colabfoldUseTemplates() ? "true" : "false",
            fieldName: "colabfold_use_templates",
          },
        ];
      case "boltz":
        return [
          {
            label: "boltz_use_potentials",
            value: this.boltzUsePotentials() ? "true" : "false",
            fieldName: "boltz_use_potentials",
          },
        ];
    }

    return [];
  }

  getFormValidationSummary(): {
    valid: boolean;
    errorCount: number;
    rowCount: number;
  } {
    const entityErrorCount = this.entityValidationResults().reduce(
      (count, rowErrors) =>
        count +
        Object.values(rowErrors).filter((value) => Boolean(value)).length,
      0
    );
    const toolErrorCount = Object.values(this.toolSettingErrors()).filter(
      (value) => Boolean(value)
    ).length;

    return {
      valid: this.isFormValid(),
      errorCount: entityErrorCount + toolErrorCount,
      rowCount: this.entityRows().length,
    };
  }

  getToolSettingsErrorCount(): number {
    return Object.values(this.toolSettingErrors()).filter((value) => Boolean(value))
      .length;
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((value) => value - 1);
    }
  }

  nextStep() {
    if (this.currentStep() === 1) {
      this.touchAllEntityRows();
      if (!this.isStep1Valid()) {
        return;
      }
    }

    if (this.currentStep() === 2) {
      this.touchToolSettings();
      if (!this.isStep2Valid()) {
        return;
      }
    }

    const current = this.currentStep();
    if (current < this.steps.length) {
      this.completedSteps.update((steps) =>
        steps.includes(current) ? steps : [...steps, current]
      );
      this.currentStep.update((value) => value + 1);
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.steps.length) {
      this.currentStep.set(step);
    }
  }

  updateAlphafold2RandomSeed(value: string): void {
    this.alphafold2RandomSeed.set(value);
  }

  updateColabfoldNumRecycles(value: string): void {
    this.colabfoldNumRecycles.set(value);
  }

  setAlphafold2RandomSeedTouched(): void {
    this.alphafold2RandomSeedTouched.set(true);
  }

  setColabfoldNumRecyclesTouched(): void {
    this.colabfoldNumRecyclesTouched.set(true);
  }

  submitWorkflow() {
    this.touchAllEntityRows();
    this.touchToolSettings();

    if (!this.isFormValid()) {
      this.showError("Please fix the validation errors before submitting.");
      return;
    }

    const payload: Record<string, unknown> = {
      tool: this.selectedToolLabel(),
      mode: this.selectedTool(),
      entities: this.entityRows().map((row, index) => ({
        id: `entity_${index + 1}`,
        moleculeType: row.moleculeType,
        copyNumber: this.getParsedCopyNumber(row.copyNumber),
        sequence: this.getNormalizedSequence(row),
      })),
      fastaContent: this.generatedFastaContent(),
      ...this.buildToolSettingsPayload(),
    };

    this.workflowSubmission.isSubmitting.set(true);

    this.datasetUploadService.uploadDataset({ formData: payload }).subscribe({
      next: (response) => {
        const datasetId = response.datasetId;
        if (!datasetId) {
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(
            "Dataset upload succeeded but no dataset ID was returned."
          );
          return;
        }

        this.workflowSubmission.submitWorkflowWithDataset(
          payload,
          datasetId,
          (error) => {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              `Workflow launch failed: ${error.message || "Unknown error"}`
            );
          }
        );
      },
      error: (error) => {
        this.workflowSubmission.isSubmitting.set(false);
        this.showError(
          `Failed to upload dataset: ${error.message || "Unknown error"}`
        );
      },
    });
  }

  submitNewJob() {
    window.location.reload();
  }

  goToJobs() {
    this.workflowSubmission.goToJobs();
  }

  loginWithReturnUrl() {
    const currentUrl = window.location.pathname + window.location.search;
    this.auth.login(currentUrl);
  }

  closeAlert(): void {
    this.showAlert.set(false);
    this.alertMessage.set("");
  }

  getMoleculeTypeLabel(type: MoleculeType): string {
    return this.moleculeTypes.find((item) => item.value === type)?.label ?? type;
  }

  private createEntityRow(): EntityRow {
    return {
      id: this.nextRowId++,
      sequence: "",
      copyNumber: "1",
      moleculeType: "protein",
      touched: {
        sequence: false,
        copyNumber: false,
        moleculeType: false,
      },
    };
  }

  private patchRow(id: number, patch: Partial<EntityRow>): void {
    this.entityRows.update((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  private touchAllEntityRows(): void {
    this.stepOneTouched.set(true);
    this.entityRows.update((rows) =>
      rows.map((row) => ({
        ...row,
        touched: {
          sequence: true,
          copyNumber: true,
          moleculeType: true,
        },
      }))
    );
  }

  private touchToolSettings(): void {
    this.stepTwoTouched.set(true);
    this.alphafold2RandomSeedTouched.set(true);
    this.colabfoldNumRecyclesTouched.set(true);
  }

  private validateEntityRow(row: EntityRow): EntityRowErrors {
    const errors: EntityRowErrors = {};
    const normalizedSequence = this.getNormalizedSequence(row);

    if (!normalizedSequence) {
      errors.sequence = "Sequence is required.";
    } else {
      const sequenceValidation = this.validateSequenceByMoleculeType(
        normalizedSequence,
        row.moleculeType
      );
      if (!sequenceValidation.valid) {
        errors.sequence = sequenceValidation.errorMessage;
      }
    }

    const copyNumber = Number.parseInt(row.copyNumber, 10);
    if (!Number.isInteger(copyNumber) || copyNumber < 1) {
      errors.copyNumber = "Copy number must be a whole number greater than or equal to 1.";
    }

    if (
      (this.selectedTool() === "colabfold" ||
        this.selectedTool() === "alphafold2") &&
      row.moleculeType !== "protein"
    ) {
      errors.tool = `${this.selectedToolLabel()} accepts protein-only input.`;
    }

    return errors;
  }

  private validateToolSettings(): ToolSettingErrors {
    if (this.selectedTool() === "alphafold2") {
      const value = Number.parseInt(this.alphafold2RandomSeed(), 10);
      if (!Number.isInteger(value) || value < 0) {
        return {
          alphafold2RandomSeed:
            "alphafold2_random_seed must be a whole number greater than or equal to 0.",
        };
      }
    }

    if (this.selectedTool() === "colabfold") {
      const value = Number.parseInt(this.colabfoldNumRecycles(), 10);
      if (!Number.isInteger(value) || value < 1) {
        return {
          colabfoldNumRecycles:
            "colabfold_num_recycles must be a whole number greater than or equal to 1.",
        };
      }
    }

    return {};
  }

  private buildToolSettingsPayload(): Record<string, unknown> {
    switch (this.selectedTool()) {
      case "alphafold2":
        return {
          alphafold2_random_seed: Number.parseInt(
            this.alphafold2RandomSeed(),
            10
          ),
          alphafold2_full_dbs: this.alphafold2FullDbs(),
        };
      case "colabfold":
        return {
          colabfold_num_recycles: Number.parseInt(
            this.colabfoldNumRecycles(),
            10
          ),
          colabfold_use_templates: this.colabfoldUseTemplates(),
        };
      case "boltz":
        return {
          boltz_use_potentials: this.boltzUsePotentials(),
        };
    }

    return {};
  }

  private getNormalizedSequence(row: EntityRow): string {
    if (row.moleculeType === "ligand") {
      return row.sequence.trim();
    }

    return row.sequence.replace(/\s+/g, "").toUpperCase();
  }

  private getParsedCopyNumber(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  private validateSequenceByMoleculeType(
    value: string,
    moleculeType: MoleculeType
  ): { valid: boolean; errorMessage?: string } {
    switch (moleculeType) {
      case "protein":
        return validateProteinSequence(value);
      case "dna":
        return validateDnaSequence(value);
      case "rna":
        return validateRnaSequence(value);
      case "ligand":
        return this.isValidSmiles(value)
          ? { valid: true }
          : {
              valid: false,
              errorMessage: "Ligand sequence must be a valid SMILES string.",
            };
    }

    return {
      valid: false,
      errorMessage: "Sequence format is invalid.",
    };
  }

  private isValidSmiles(value: string): boolean {
    if (!value || /\s/.test(value)) {
      return false;
    }

    if (!/^[A-Za-z0-9@+\-\[\]\(\)=#$\\/%.:*]+$/.test(value)) {
      return false;
    }

    const stack: string[] = [];
    const pairs: Record<string, string> = {
      ")": "(",
      "]": "[",
    };

    for (const char of value) {
      if (char === "(" || char === "[") {
        stack.push(char);
      } else if (char === ")" || char === "]") {
        const expected = pairs[char];
        if (stack.pop() !== expected) {
          return false;
        }
      }
    }

    return stack.length === 0 && /[A-Za-z]/.test(value);
  }

  private showError(message: string): void {
    this.alertMessage.set(message);
    this.showAlert.set(true);
  }
}
