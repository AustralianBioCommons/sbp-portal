import { switchMap, map } from "rxjs";
import { CommonModule } from "@angular/common";
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { Component, computed, inject, Signal, signal } from "@angular/core";
import { AlertComponent } from "../../../components/alert/alert.component";
import { ButtonComponent } from "../../../components/button/button.component";
import { DialogComponent } from "../../../components/dialog/dialog.component";
import { LoadingComponent } from "../../../components/loading/loading.component";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
import { FormStatusComponent } from "../../../components/workflow/form-status/form-status.component";
import {
  ListboxSelectComponent,
  ListboxSelectOption,
} from "../../../components/workflow/listbox-select/listbox-select.component";
import { StepContentComponent } from "../../../components/workflow/step-content/step-content.component";
import {
  Step,
  StepNavigationComponent,
} from "../../../components/workflow/step-navigation/step-navigation.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../../../components/workflow/tool-selection/tool-selection.component";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../cores/auth.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { FastaUploadService } from "../../../cores/services/fasta-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import {
  CCD_COMPOUNDS,
  isValidSmiles,
  lookupCcdCompound,
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence,
} from "../../../cores/utils/fasta.utils";

interface TabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

type MoleculeType = "protein" | "rna" | "dna" | "ligand" | "ccd";
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
    ListboxSelectComponent,
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
  readonly profileUrl = environment.profileUrl;
  public workflowSubmission = inject(WorkflowSubmissionService);
  private datasetUploadService = inject(DatasetUploadService);
  private fastaUploadService = inject(FastaUploadService);

  readonly ccdOptions: ListboxSelectOption[] = Object.entries(
    CCD_COMPOUNDS
  ).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));

  private readonly samplesheetId = "single_prediction";
  private nextRowId = 1;
  ccdLookupState = signal<Record<number, "idle" | "valid" | "invalid">>({});
  ccdLookupNames = signal<Record<number, string>>({}); // compound name resolved from the local CCD dictionary via lookupCcdCompound()
  ccdLookupErrors = signal<Record<number, string>>({}); // validation error message produced by the local CCD dictionary lookup
  private preparedFastaContent = signal<string | null>(null);
  private preparedFastaUrl = signal<string | null>(null);
  private preparedSamplesheetDatasetId = signal<string | null>(null);

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
  isToolAvailable = signal(true);
  selectedTool = signal<ToolId>("colabfold");
  selectedToolLabel: Signal<string> = computed(
    () =>
      this.tools.find((tool) => tool.id === this.selectedTool())?.label ?? ""
  );

  readonly moleculeTypes: { value: MoleculeType; label: string }[] = [
    { value: "protein", label: "Protein" },
    { value: "rna", label: "RNA" },
    { value: "dna", label: "DNA" },
    { value: "ligand", label: "Ligand (SMILES)" },
    { value: "ccd", label: "Ligand (CCD)" },
  ];
  readonly moleculeTypeOptions: ListboxSelectOption[] = this.moleculeTypes.map(
    (item) => ({ value: item.value, label: item.label })
  );

  entityRows = signal<EntityRow[]>([this.createEntityRow()]);
  stepOneTouched = signal(false);
  stepTwoTouched = signal(false);

  runName = signal("");
  runNameTouched = signal(false);

  alphafold2RandomSeed = signal("42");
  alphafold2FullDbs = signal(false);
  colabfoldNumRecycles = signal("3");
  colabfoldUseTemplates = signal(false);
  boltzUsePotentials = signal(false);
  alphafold2RandomSeedTouched = signal(false);
  colabfoldNumRecyclesTouched = signal(false);

  readonly steps: StepItem[] = [
    {
      id: 1,
      title: "Input Configuration",
      description:
        "Define one or more entities with sequence, copies, and molecule type",
    },
    {
      id: 2,
      title: "Tool Settings",
      description: "Configure only the settings required by the selected tool",
    },
    {
      id: 3,
      title: "Review & Submit",
      description:
        "Review entities, settings, and generated FASTA content before submission",
    },
  ];
  currentStep = signal<number>(1);
  completedSteps = signal<number[]>([]);
  visitedSteps = signal<number[]>([1]);
  isStepVisited = (id: number) => this.visitedSteps().includes(id);

  readonly entityValidationResults = computed(() =>
    this.entityRows().map((row) => this.validateEntityRow(row))
  );
  readonly toolSettingErrors = computed(() => this.validateToolSettings());
  readonly isStep1Valid = computed(
    () =>
      this.runName().trim().length > 0 &&
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

  readonly canSubmit = computed(
    () => this.isFormValid() && this.isToolAvailable()
  );

  readonly formSummary = computed(() => {
    const entityItems = this.entityRows().map((row, index) => ({
      label: `Entity ${index + 1}`,
      value: `${this.getMoleculeTypeLabel(
        row.moleculeType
      )} x${this.getParsedCopyNumber(
        row.copyNumber
      )} • ${this.getNormalizedSequence(row)}`,
      fieldName: `entity_${row.id}`,
    }));

    const settingItems = this.getToolSettingsSummaryItems();

    return [...entityItems, ...settingItems];
  });

  readonly generatedFastaContent = computed(() => {
    if (!this.isStep1Valid()) {
      return "";
    }

    const fastaRecords: string[] = [];
    let sequenceNumber = 1;

    for (const row of this.entityRows()) {
      const copies = this.getParsedCopyNumber(row.copyNumber);
      const sequence = this.getNormalizedSequence(row);

      for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
        fastaRecords.push(
          [
            `>${this.getFastaSequenceId(row.moleculeType, sequenceNumber)}`,
            sequence,
          ].join("\n")
        );
        sequenceNumber += 1;
      }
    }

    return fastaRecords.join("\n");
  });

  switchTab(id: TabItem["id"]) {
    this.activeTab.set(id);
  }

  selectTool(id: ToolId) {
    this.selectedTool.set(id);
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
    this.ccdLookupState.update((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    this.ccdLookupNames.update((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    this.ccdLookupErrors.update((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  }

  updateRowSequence(id: number, value: string): void {
    this.patchRow(id, { sequence: value });
    const row = this.entityRows().find((r) => r.id === id);
    if (row?.moleculeType === "ccd") {
      this.triggerCcdLookup(id, value);
    }
  }

  updateRowCopyNumber(id: number, value: string): void {
    this.patchRow(id, { copyNumber: value });
  }

  updateRowMoleculeType(id: number, value: string): void {
    this.patchRow(id, { moleculeType: value as MoleculeType });
    if (value === "ccd") {
      const row = this.entityRows().find((r) => r.id === id);
      if (row?.sequence) {
        this.triggerCcdLookup(id, row.sequence);
      }
    } else {
      // Clear CCD state when switching away from ccd type
      this.ccdLookupState.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      this.ccdLookupNames.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      this.ccdLookupErrors.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }
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

  isStepCompleted = (id: number) => {
    if (id === 1) {
      return (
        this.isStep1Valid() &&
        (this.completedSteps().includes(1) || this.currentStep() > 1)
      );
    }
    if (id === 2) {
      return (
        this.isStep2Valid() &&
        (this.completedSteps().includes(2) || this.currentStep() > 2)
      );
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

  shouldShowRowFieldError(
    row: EntityRow,
    field: keyof EntityRow["touched"]
  ): boolean {
    if (field === "sequence" && row.sequence.trim().length > 0) {
      return true;
    }
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
    return Object.values(this.toolSettingErrors()).filter((value) =>
      Boolean(value)
    ).length;
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
      this.advanceStep();
      return;
    }

    if (this.currentStep() === 2) {
      this.touchToolSettings();
      if (!this.isStep2Valid()) {
        return;
      }
    }

    this.advanceStep();
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.steps.length) {
      this.currentStep.set(step);
      this.visitedSteps.update((arr) =>
        arr.includes(step) ? arr : [...arr, step]
      );
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
    if (!this.isToolAvailable()) {
      this.showError(
        "Tools are currently not available. Submission is disabled."
      );
      return;
    }

    this.touchAllEntityRows();
    this.touchToolSettings();

    if (!this.isFormValid()) {
      this.showError("Please fix the validation errors before submitting.");
      return;
    }

    this.workflowSubmission.isSubmitting.set(true);

    this.prepareSinglePredictionInput((fastaUrl, datasetId) => {
      this.submitPreparedWorkflow(datasetId, fastaUrl);
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
    return (
      this.moleculeTypes.find((item) => item.value === type)?.label ?? type
    );
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

  private triggerCcdLookup(id: number, code: string): void {
    if (!code.trim()) {
      this.ccdLookupState.update((s) => ({ ...s, [id]: "idle" }));
      this.ccdLookupNames.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      this.ccdLookupErrors.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      return;
    }

    const result = lookupCcdCompound(code);
    this.ccdLookupState.update((s) => ({
      ...s,
      [id]: result.valid ? "valid" : "invalid",
    }));
    if (result.valid && result.name) {
      this.ccdLookupNames.update((s) => ({ ...s, [id]: result.name }));
      this.ccdLookupErrors.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    } else if (!result.valid && result.errorMessage) {
      this.ccdLookupErrors.update((s) => ({
        ...s,
        [id]: result.errorMessage,
      }));
      this.ccdLookupNames.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }
  }

  private touchAllEntityRows(): void {
    this.stepOneTouched.set(true);
    this.runNameTouched.set(true);
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
      } else if (row.moleculeType === "ccd") {
        const lookupState = this.ccdLookupState()[row.id];
        if (lookupState === "invalid") {
          errors.sequence =
            this.ccdLookupErrors()[row.id] ?? "CCD code is invalid.";
        }
      }
    }

    const copyNumber = Number.parseInt(row.copyNumber, 10);
    if (!Number.isInteger(copyNumber) || copyNumber < 1) {
      errors.copyNumber =
        "Copy number must be a whole number greater than or equal to 1.";
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
    if (row.moleculeType === "ccd") {
      return row.sequence.trim().toUpperCase();
    }

    return row.sequence.replace(/\s+/g, "").toUpperCase();
  }

  private getParsedCopyNumber(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  private advanceStep(): void {
    const current = this.currentStep();
    if (current < this.steps.length) {
      this.completedSteps.update((steps) =>
        steps.includes(current) ? steps : [...steps, current]
      );
      this.currentStep.update((value) => value + 1);
      this.visitedSteps.update((arr) => {
        const next = current + 1;
        return arr.includes(next) ? arr : [...arr, next];
      });
    }
  }

  private prepareSinglePredictionInput(
    onPrepared: (fastaUrl: string, datasetId: string) => void
  ): void {
    const fastaContent = this.generatedFastaContent();
    const cachedDatasetId = this.preparedSamplesheetDatasetId();
    const cachedFastaUrl = this.preparedFastaUrl();
    if (
      cachedDatasetId &&
      cachedFastaUrl &&
      this.preparedFastaContent() === fastaContent
    ) {
      onPrepared(cachedFastaUrl, cachedDatasetId);
      return;
    }

    const fastaFile = new File([fastaContent], `${this.samplesheetId}.fasta`, {
      type: "text/plain",
    });

    this.fastaUploadService
      .uploadFastaFile({ file: fastaFile })
      .pipe(
        switchMap((response) => {
          if (!response.s3Uri) {
            throw new Error(
              "FASTA upload succeeded but no S3 URI was returned."
            );
          }
          return this.datasetUploadService
            .uploadDataset({
              formData: { id: this.samplesheetId, fasta: response.s3Uri },
              datasetName: `${this.samplesheetId}-samplesheet-${Date.now()}`,
              datasetDescription: "Single prediction samplesheet",
            })
            .pipe(
              map((datasetResponse) => ({
                fastaUrl: response.s3Uri,
                datasetResponse,
              }))
            );
        })
      )
      .subscribe({
        next: ({ fastaUrl, datasetResponse }) => {
          const datasetId = datasetResponse.datasetId;
          if (!datasetId) {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no dataset ID was returned."
            );
            return;
          }
          this.preparedFastaContent.set(fastaContent);
          this.preparedFastaUrl.set(fastaUrl);
          this.preparedSamplesheetDatasetId.set(datasetId);
          onPrepared(fastaUrl, datasetId);
        },
        error: (error: Error) => {
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(error.message || "Unknown error");
        },
      });
  }

  private submitPreparedWorkflow(datasetId: string, fastaUrl: string): void {
    this.workflowSubmission.submitWorkflowWithDataset(
      {
        ...this.buildWorkflowPayload(),
        fastaFileUrl: fastaUrl,
        samplesheetId: this.samplesheetId,
      },
      datasetId,
      (error) => {
        this.workflowSubmission.isSubmitting.set(false);
        this.showError(
          `Workflow launch failed: ${error.message || "Unknown error"}`
        );
      }
    );
  }

  private buildUniqueRunName(): string {
    const base = this.runName().trim();
    const slug =
      base
        .replace(/[^a-zA-Z0-9\-_]/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-|-$/g, "") || "run";
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
      now.getUTCDate()
    )}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
      now.getUTCSeconds()
    )}`;
    const rand = Math.random().toString(36).slice(2, 6);
    return `${slug}-${ts}-${rand}`;
  }

  private buildWorkflowPayload(): Record<string, unknown> {
    return {
      tool: "Proteinfold",
      runName: this.runName().trim(),
      seqeraRunName: this.buildUniqueRunName(),
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
  }

  private getFastaSequenceId(
    type: MoleculeType,
    sequenceNumber: number
  ): string {
    const prefixes: Record<MoleculeType, string> = {
      protein: "pro",
      rna: "rna",
      dna: "dna",
      ligand: "ligand",
      ccd: "ccd",
    };
    return `${prefixes[type]}_${sequenceNumber}`;
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
        return isValidSmiles(value)
          ? { valid: true }
          : {
              valid: false,
              errorMessage: "Ligand sequence must be a valid SMILES string.",
            };
      case "ccd":
        return { valid: true };
    }

    return {
      valid: false,
      errorMessage: "Sequence format is invalid.",
    };
  }

  private showError(message: string): void {
    this.alertMessage.set(message);
    this.showAlert.set(true);
  }
}
