import { switchMap, map, startWith } from "rxjs";
import { CommonModule } from "@angular/common";
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { Component, computed, inject, Signal, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NonNullableFormBuilder, ReactiveFormsModule } from "@angular/forms";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { bootstrapGripVertical } from "@ng-icons/bootstrap-icons";
import { heroTrash } from "@ng-icons/heroicons/outline";
import {
  JOB_NAME_VALIDATORS,
  jobNameErrorMessage,
} from "../shared/job-name.validators";
import { ButtonComponent } from "../../../components/button/button.component";
import { CreditSummaryComponent } from "../components/credit-summary/credit-summary.component";
import { WorkflowPreviewModalComponent } from "../components/workflow-preview-modal/workflow-preview-modal.component";
import {
  ListboxSelectComponent,
  ListboxSelectOption,
} from "../components/listbox-select/listbox-select.component";
import { StepContentComponent } from "../components/step-content/step-content.component";
import { WorkflowLayoutComponent } from "../layout/workflow-layout/workflow-layout.component";
import {
  WorkflowFormComponent,
  WorkflowSection,
} from "../components/workflow-form/workflow-form.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../components/tool-selection/tool-selection.component";
import { DatasetUploadService } from "../services/dataset-upload.service";
import { FastaUploadService } from "../services/fasta-upload.service";
import { getErrorMessage } from "../../../core/utils/error.utils";
import {
  CCD_COMPOUNDS,
  isValidSmiles,
  lookupCcdCompound,
  validateDnaSequence,
  validateFastaHeader,
  validateProteinSequence,
  validateRnaSequence,
} from "../shared/fasta.utils";
import {
  SinglePredictionPayload,
  SinglePredictionToolSettingsPayload,
  WorkflowTool,
} from "../shared/workflow.interfaces";
import { WorkflowPageBase } from "../shared/workflow-page-base";

type MoleculeType = "protein" | "rna" | "dna" | "ligand" | "ccd";
type SinglePredictionTool = Extract<
  WorkflowTool,
  "colabfold" | "alphafold2" | "boltz"
>;

interface ToolChip extends ToolOption {
  id: SinglePredictionTool;
}

interface EntityRow {
  id: number;
  name: string;
  sequence: string;
  copyNumber: string;
  moleculeType: MoleculeType;
  touched: {
    name: boolean;
    sequence: boolean;
    copyNumber: boolean;
    moleculeType: boolean;
  };
}

interface EntityRowErrors {
  name?: string;
  sequence?: string;
  copyNumber?: string;
  tool?: string;
}

interface ToolSettingErrors {
  alphafold2RandomSeed?: string;
  colabfoldNumRecycles?: string;
}

interface SequenceCell {
  char: string;
  label: string;
}

@Component({
  selector: "app-single-prediction",
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    ButtonComponent,
    ToolSelectionComponent,
    ListboxSelectComponent,
    WorkflowFormComponent,
    WorkflowLayoutComponent,
    StepContentComponent,
    NgIconComponent,
    CreditSummaryComponent,
    WorkflowPreviewModalComponent,
  ],
  providers: [provideIcons({ bootstrapGripVertical, heroTrash })],
  host: {
    class: "block w-full single-prediction-bg",
  },
  templateUrl: "./single-prediction.html",
  styleUrl: "./single-prediction.scss",
})
export default class SinglePredictionComponent extends WorkflowPageBase {
  private datasetUploadService = inject(DatasetUploadService);
  private fastaUploadService = inject(FastaUploadService);

  protected readonly workflowCategory = "single-prediction" as const;

  /** Credit cost of the run: tool multiplier × 1 (a single prediction). */
  readonly creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    return multiplier == null ? null : multiplier;
  });

  readonly ccdOptions: ListboxSelectOption[] = Object.entries(
    CCD_COMPOUNDS
  ).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));

  private nextRowId = 1;
  ccdLookupState = signal<Record<number, "idle" | "valid" | "invalid">>({});
  ccdLookupNames = signal<Record<number, string>>({}); // compound name resolved from the local CCD dictionary via lookupCcdCompound()
  ccdLookupErrors = signal<Record<number, string>>({}); // validation error message produced by the local CCD dictionary lookup
  private preparedFastaContent = signal<string | null>(null);
  private preparedFastaUrl = signal<string | null>(null);
  private preparedSamplesheetS3Key = signal<string | null>(null);
  private preparedSamplesheetId = signal<string | null>(null);
  private get samplesheetId(): string {
    return this.jobName().trim();
  }

  readonly tools: ToolChip[] = [
    { id: "colabfold", label: "ColabFold" },
    { id: "alphafold2", label: "AlphaFold2" },
    { id: "boltz", label: "Boltz" },
  ];
  isToolAvailable = signal(true);
  selectedTool = signal<SinglePredictionTool>("colabfold");
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

  private readonly fb = inject(NonNullableFormBuilder);
  readonly form = this.fb.group({
    jobName: ["", JOB_NAME_VALIDATORS],
  });
  readonly jobName = toSignal(
    this.form.controls.jobName.valueChanges.pipe(
      startWith(this.form.controls.jobName.value)
    ),
    { initialValue: this.form.controls.jobName.value }
  );
  hasJobNameError(): boolean {
    const ctrl = this.form.controls.jobName;
    return ctrl.touched && ctrl.invalid;
  }

  getJobNameError(): string {
    return jobNameErrorMessage(this.form.controls.jobName.errors);
  }

  alphafold2RandomSeed = signal("42");
  alphafold2FullDbs = signal(false);
  colabfoldNumRecycles = signal("3");
  colabfoldUseTemplates = signal(false);
  boltzUsePotentials = signal(false);
  alphafold2RandomSeedTouched = signal(false);
  colabfoldNumRecyclesTouched = signal(false);

  // Single-page form sections (rendered + tracked by app-workflow-form)
  readonly sections: WorkflowSection[] = [
    { id: "select-tool", label: "Select a Tool", mobileLabel: "Tool" },
    { id: "input-config", label: "Input Configuration", mobileLabel: "Input" },
    { id: "tool-settings", label: "Tool Settings", mobileLabel: "Settings" },
    { id: "review", label: "Review & Submit", mobileLabel: "Review" },
  ];

  readonly entityValidationResults = computed(() =>
    this.entityRows().map((row) => this.validateEntityRow(row))
  );
  readonly toolSettingErrors = computed(() => this.validateToolSettings());
  readonly isStep1Valid = computed(() => {
    this.jobName();
    return (
      this.form.controls.jobName.valid &&
      this.entityRows().length > 0 &&
      this.entityValidationResults().every(
        (errors) =>
          !errors.name && !errors.sequence && !errors.copyNumber && !errors.tool
      )
    );
  });
  readonly isStep2Valid = computed(
    () => Object.keys(this.toolSettingErrors()).length === 0
  );
  readonly isFormValid = computed(
    () => this.isStep1Valid() && this.isStep2Valid() && this.isToolAvailable()
  );

  /** Per-section validity — drives the progress-bar colours. */
  isSectionValid = (id: string): boolean => {
    switch (id) {
      case "select-tool":
        return this.isToolAvailable();
      case "input-config":
        return this.isStep1Valid();
      case "tool-settings":
        return this.isStep2Valid();
      case "review":
        return this.isFormValid();
      default:
        return true;
    }
  };

  readonly formSummary = computed(() => {
    const entityItems = this.entityRows().map((row, index) => {
      const sequence = this.getNormalizedSequence(row);
      return {
        label: row.name.trim() || `Entity ${index + 1}`,
        value: sequence
          ? `${this.getMoleculeTypeLabel(
              row.moleculeType
            )} x${this.getParsedCopyNumber(row.copyNumber)} – ${sequence}`
          : "",
        fieldName: `entity_${row.id}`,
      };
    });

    return [
      { label: "Job Name", value: this.jobName().trim(), fieldName: "job_id" },
      ...entityItems,
    ];
  });

  readonly generatedFastaContent = computed(() => {
    if (!this.isStep1Valid()) {
      return "";
    }

    const fastaRecords: string[] = [];

    for (const row of this.entityRows()) {
      const copies = this.getParsedCopyNumber(row.copyNumber);
      const sequence = this.getNormalizedSequence(row);
      const name = row.name.trim();
      const type = this.getFastaMoleculeType(row.moleculeType);

      for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
        const headerId = copies > 1 ? `${name}_${copyIndex + 1}` : name;
        fastaRecords.push(`>${headerId}|${type}\n${sequence}`);
      }
    }

    return fastaRecords.join("\n");
  });

  selectTool(id: SinglePredictionTool) {
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

  updateRowName(id: number, value: string): void {
    this.patchRow(id, { name: value });
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

  protected override guardSubmission(): boolean {
    if (!this.isToolAvailable()) {
      this.showError(
        "Tools are currently not available. Submission is disabled."
      );
      return false;
    }
    return true;
  }

  protected validateAll(): void {
    this.touchAllEntityRows();
    this.touchToolSettings();
  }

  protected performSubmit(): void {
    this.workflowSubmission.isSubmitting.set(true);

    this.prepareSinglePredictionInput((fastaUrl, s3InputKey) => {
      this.submitPreparedWorkflow(s3InputKey, fastaUrl);
    });
  }

  getMoleculeTypeLabel(type: MoleculeType): string {
    return (
      this.moleculeTypes.find((item) => item.value === type)?.label ?? type
    );
  }

  /** Maps an entity's molecule type to the FASTA header type tag (e.g. `>name|protein`). */
  private getFastaMoleculeType(type: MoleculeType): string {
    return type === "ligand" ? "smiles" : type;
  }

  private createEntityRow(): EntityRow {
    const id = this.nextRowId++;
    return {
      id,
      name: "",
      sequence: "",
      copyNumber: "1",
      moleculeType: "protein",
      touched: {
        name: false,
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
      this.ccdLookupNames.update((s) => ({ ...s, [id]: result.name! }));
      this.ccdLookupErrors.update((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    } else if (!result.valid && result.errorMessage) {
      const errorMessage = result.errorMessage;
      this.ccdLookupErrors.update((s) => ({
        ...s,
        [id]: errorMessage,
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
    this.form.markAllAsTouched();
    this.entityRows.update((rows) =>
      rows.map((row) => ({
        ...row,
        touched: {
          name: true,
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

    const otherNames = this.entityRows()
      .filter((r) => r.id !== row.id)
      .map((r) => r.name);
    const headerValidation = validateFastaHeader(row.name, otherNames);
    if (!headerValidation.valid) {
      errors.name = headerValidation.errorMessage;
    }

    const normalizedSequence = this.getNormalizedSequence(row);

    if (
      row.moleculeType !== "ccd" &&
      row.moleculeType !== "ligand" &&
      /\s/.test(row.sequence)
    ) {
      errors.sequence = "Sequence must not contain spaces or line breaks";
    } else if (!normalizedSequence) {
      errors.sequence = "Sequence is required";
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
            this.ccdLookupErrors()[row.id] ?? "CCD code is invalid";
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

  private buildToolSettingsPayload(): SinglePredictionToolSettingsPayload {
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

  /** 1-based position labels for the sequence ruler overlay: every 10th character and the last one. */
  getSequenceCells(sequence: string): SequenceCell[] {
    const length = sequence.length;
    return Array.from(sequence, (char, index) => {
      const position = index + 1;
      const label =
        position % 10 === 0 || position === length ? String(position) : "";
      return { char, label };
    });
  }

  /** Keeps the decorative position-ruler layer scrolled in sync with the real textarea beneath it. */
  syncSequenceOverlayScroll(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const overlay = textarea.previousElementSibling as HTMLElement | null;
    if (overlay) {
      overlay.scrollTop = textarea.scrollTop;
    }
  }

  getNormalizedSequence(row: EntityRow): string {
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

  private prepareSinglePredictionInput(
    onPrepared: (fastaUrl: string, s3InputKey: string) => void
  ): void {
    const fastaContent = this.generatedFastaContent();
    const samplesheetId = this.samplesheetId;
    const cachedS3InputKey = this.preparedSamplesheetS3Key();
    const cachedFastaUrl = this.preparedFastaUrl();
    if (
      cachedS3InputKey &&
      cachedFastaUrl &&
      this.preparedFastaContent() === fastaContent &&
      this.preparedSamplesheetId() === samplesheetId
    ) {
      onPrepared(cachedFastaUrl, cachedS3InputKey);
      return;
    }

    const fastaFile = new File([fastaContent], `${samplesheetId}.fasta`, {
      type: "text/plain",
    });

    this.fastaUploadService
      .uploadFastaFile({
        file: fastaFile,
        folder: this.workflowInputDir,
      })
      .pipe(
        switchMap((response) => {
          if (!response.s3Uri) {
            throw new Error(
              "FASTA upload succeeded but no S3 URI was returned."
            );
          }
          return this.datasetUploadService
            .uploadDataset({
              formData: { id: samplesheetId, fasta: response.s3Uri },
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
          const s3InputKey = datasetResponse.s3Key;
          if (!s3InputKey) {
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no S3 key was returned."
            );
            return;
          }
          this.preparedFastaContent.set(fastaContent);
          this.preparedFastaUrl.set(fastaUrl);
          this.preparedSamplesheetS3Key.set(s3InputKey);
          this.preparedSamplesheetId.set(samplesheetId);
          onPrepared(fastaUrl, s3InputKey);
        },
        error: (error: unknown) => {
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(getErrorMessage(error));
        },
      });
  }

  private submitPreparedWorkflow(s3InputKey: string, fastaUrl: string): void {
    this.workflowSubmission.submitWorkflowWithDataset(
      {
        ...this.buildWorkflowPayload(),
        fastaFileUrl: fastaUrl,
        sample_id: this.samplesheetId,
      },
      s3InputKey,
      (error) => {
        this.workflowSubmission.isSubmitting.set(false);
        this.showError(
          `Workflow launch failed: ${error.message || "Unknown error"}`
        );
      }
    );
  }

  private buildWorkflowPayload(): Omit<
    SinglePredictionPayload,
    "fastaFileUrl" | "sample_id"
  > {
    return {
      workflow: "single-prediction",
      tool: this.selectedTool(),
      runName: this.jobName().trim(),
      entities: this.entityRows().map((row) => ({
        id: row.name.trim(),
        moleculeType: row.moleculeType,
        copyNumber: this.getParsedCopyNumber(row.copyNumber),
        sequence: this.getNormalizedSequence(row),
      })),
      fastaContent: this.generatedFastaContent(),
      ...this.buildToolSettingsPayload(),
    };
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
}
