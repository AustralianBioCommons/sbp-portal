import { CommonModule, DOCUMENT } from "@angular/common";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowUpTray,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroEllipsisVertical,
  heroXMark,
} from "@ng-icons/heroicons/outline";
import { heroXCircleSolid } from "@ng-icons/heroicons/solid";
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  Signal,
  signal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NonNullableFormBuilder, ReactiveFormsModule } from "@angular/forms";
import {
  JOB_NAME_VALIDATORS,
  jobNameErrorMessage,
} from "../shared/job-name.validators";
import { ButtonComponent } from "../../../components/button/button.component";
import { TooltipComponent } from "../../../components/tooltip/tooltip.component";
import { MolstarViewerComponent } from "../components/molstar-viewer/molstar-viewer.component";
import { LengthRangeSliderComponent } from "../components/length-range-slider/length-range-slider.component";

import { filter, startWith, Subscription, take } from "rxjs";
import { FormFieldComponent } from "../components/form-field/form-field.component";
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
import { CreditSummaryComponent } from "../components/credit-summary/credit-summary.component";
import { WorkflowPreviewModalComponent } from "../components/workflow-preview-modal/workflow-preview-modal.component";
import { DatasetUploadService } from "../services/dataset-upload.service";
import { PdbUploadService } from "../services/pdb-upload.service";
import { SchemaLoaderService } from "../services/schema-loader.service";
import { InputSchemaField } from "../services/input-schema.service";
import { getErrorMessage } from "../../../core/utils/error.utils";
import {
  DeNovoDesignPayload,
  WorkflowTool,
} from "../shared/workflow.interfaces";
import { WorkflowPageBase } from "../shared/workflow-page-base";

interface ToolChip extends ToolOption {
  id: Extract<WorkflowTool, "bindcraft" | "rfdiffusion">;
}

/** Both bindcraft and rfdiffusion only support up to this many hotspot residues. */
const MAX_HOTSPOT_RESIDUES = 8;

@Component({
  selector: "app-de-novo-design",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TooltipComponent,
    ToolSelectionComponent,
    WorkflowFormComponent,
    WorkflowLayoutComponent,
    StepContentComponent,
    FormFieldComponent,
    MolstarViewerComponent,
    LengthRangeSliderComponent,
    CreditSummaryComponent,
    WorkflowPreviewModalComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroArrowUpTray,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
      heroEllipsisVertical,
      heroXCircleSolid,
      heroXMark,
    }),
  ],
  templateUrl: "./de-novo-design.html",
  styleUrl: "./de-novo-design.scss",
})
export default class DeNovoDesignComponent
  extends WorkflowPageBase
  implements OnInit, OnDestroy
{
  // // Make Object available in template
  Object = Object;

  // Document reference (SSR-safe; avoids touching the global directly)
  private readonly document = inject(DOCUMENT);
  // Schema loader service
  public schemaLoader = inject(SchemaLoaderService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // PDB upload service
  private pdbUploadService = inject(PdbUploadService);

  protected readonly workflowCategory = "de-novo-design" as const;

  // Schema URLs for bindflow workflow
  private readonly inputSchemaUrl =
    "https://raw.githubusercontent.com/AustralianBioCommons/sbp-bindflow/refs/heads/dev/assets/schema_input.json";

  // Job Name (reactive form field)
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

  // Form data and validation
  formData = signal<Record<string, unknown>>({});
  formErrors = signal<{ [key: string]: string }>({});
  readonly isFormValid = computed<boolean>(() => {
    this.jobName();
    if (this.form.controls.jobName.invalid) return false;
    if (Object.keys(this.formErrors()).length > 0) return false;
    const rows = this.schemaLoader.inputRows();
    if (rows.length === 0) return false;
    const requiredFields = this.schemaLoader.requiredInputFields();
    return rows.every((row) =>
      requiredFields.every((field) => {
        if (
          field.name === "binder_name" ||
          field.name === "id" ||
          field.name === "chains"
        )
          return true;
        const value = row.values[field.name];
        return value !== undefined && value !== null && value !== "";
      })
    );
  });

  // Tools
  readonly tools: ToolChip[] = [
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

  /** Raw local File for the starting_pdb field – shown in Mol* viewer immediately.
   *  Actual upload to S3 is deferred until the user clicks Next. */
  localPdbFile = signal<File | null>(null);

  /** Parsed chain → residue-number set from the loaded PDB.  Populated
   *  asynchronously after the user picks a file; null until then. */
  pdbResidueMap = signal<Map<string, Set<number>> | null>(null);

  /** Reference to the File object that was last successfully uploaded.
   *  Used to skip re-upload when the user navigates Back then Next again. */
  private uploadedPdbFile = signal<File | null>(null);

  /** Schema default max_length — drives the range slider upper bound. */
  pdbSequenceLength = signal<number>(300);
  /** Schema default min_length — drives the range slider lower bound. */
  pdbSequenceMin = signal<number>(0);

  /** True while the PDB file is being uploaded to S3 on Next click. */
  isPdbUploading = signal(false);

  /** Default width (px) of the config panel when opened. */
  readonly defaultPanelWidth = 300;
  /** Minimum width (px) of the config panel while open — the divider drag
   *  cannot shrink it below this; below it the panel can only be fully closed (0). */
  readonly minPanelWidth = 240;
  /** Maximum width (px) the config panel can be dragged to. */
  readonly maxPanelWidth = 480;

  /** Width of the config panel in pixels. 0 = fully collapsed. */
  panelWidth = signal(this.defaultPanelWidth);
  /** True during an active divider drag — suppresses CSS transition for smooth tracking. */
  isDragging = signal(false);

  private _dragStartX = 0;
  private _dragStartPanelWidth = 0;
  /** Step (px) the divider moves per arrow-key press for keyboard resizing. */
  private readonly keyboardResizeStep = 12;

  /** Clamp a width to the open panel's allowed range. */
  private clampPanelWidth(width: number): number {
    return Math.max(this.minPanelWidth, Math.min(this.maxPanelWidth, width));
  }

  onDividerMouseDown(event: MouseEvent): void {
    if (this.panelWidth() === 0) return;
    this.isDragging.set(true);
    this._dragStartX = event.clientX;
    this._dragStartPanelWidth = this.panelWidth();
    event.preventDefault();

    this.document.addEventListener("mousemove", this.onDocumentMouseMove);
    this.document.addEventListener("mouseup", this.onDocumentMouseUp);
  }

  private onDocumentMouseMove = (event: MouseEvent): void => {
    const delta = this._dragStartX - event.clientX;
    this.panelWidth.set(
      this.clampPanelWidth(this._dragStartPanelWidth + delta)
    );
  };

  private onDocumentMouseUp = (): void => {
    this.isDragging.set(false);
    this.document.removeEventListener("mousemove", this.onDocumentMouseMove);
    this.document.removeEventListener("mouseup", this.onDocumentMouseUp);
  };

  onDividerKeydown(event: KeyboardEvent): void {
    if (this.panelWidth() === 0) return;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = this.panelWidth() + this.keyboardResizeStep;
        break;
      case "ArrowRight":
        next = this.panelWidth() - this.keyboardResizeStep;
        break;
      case "Home":
        next = this.maxPanelWidth;
        break;
      case "End":
        next = this.minPanelWidth;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.panelWidth.set(this.clampPanelWidth(next));
  }

  /** Called when user picks a .pdb file via the custom picker.
   *  Sets the local viewer file and marks the form field value with the
   *  filename so required validation passes before the real upload. */
  onPdbFilePicked(file: File, rowId: string): void {
    const validation = this.pdbUploadService.validatePdbFile(file);
    if (!validation.valid) {
      this.showError(validation.error ?? "Invalid PDB file.");
      return;
    }
    // If replacing an existing file, clear only structure-derived fields;
    // min_length, max_length, and pdbSequenceLength stay at schema defaults.
    if (this.localPdbFile()) {
      this.updateRowValue(rowId, "target_hotspot_residues", "");
      this.programmaticViewerSelection.set("");
    }
    this.localPdbFile.set(file);
    // New file picked — reset upload tracking so Next will upload this file.
    this.uploadedPdbFile.set(null);
    // Use filename as placeholder value so schema required-check passes.
    this.updateRowValueWithValidation(rowId, "starting_pdb", file.name);
  }

  clearLocalPdb(rowId: string): void {
    this.localPdbFile.set(null);
    this.uploadedPdbFile.set(null);
    this.pdbResidueMap.set(null);
    this.programmaticViewerSelection.set("");
    this.updateRowValueWithValidation(rowId, "starting_pdb", "");
    this.updateRowValueWithValidation(rowId, "target_hotspot_residues", "");
  }

  /** Receives the chain→residue map emitted by the Mol* viewer after it
   *  parses the PDB structure — no need to re-parse the file ourselves. */
  onStructureResiduesDetected(residues: Map<string, Set<number>>): void {
    this.pdbResidueMap.set(residues.size > 0 ? residues : null);
  }

  private validateHotspotResidues(value: string): string | null {
    if (!value?.trim()) return null;
    const residueMap = this.pdbResidueMap();

    let residueCount = 0;
    for (const token of value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)) {
      const parsed = MolstarViewerComponent.parseResidueToken(token);
      if (!parsed) {
        return `Invalid format "${token}". Use chain+residue notation, e.g. "A56" or "A56,A57"`;
      }

      residueCount += Math.abs(parsed.resEnd - parsed.resStart) + 1;
      if (residueCount > MAX_HOTSPOT_RESIDUES) {
        return `Too many hotspot residues selected (${residueCount}). Only up to ${MAX_HOTSPOT_RESIDUES} are supported - remove some to continue.`;
      }

      if (!residueMap) continue;

      const chainResidues = residueMap.get(parsed.chain);
      if (!chainResidues) {
        return `Chain "${parsed.chain}" not found in PDB. Available: ${[
          ...residueMap.keys(),
        ]
          .sort()
          .join(", ")}`;
      }
      if (!chainResidues.has(parsed.resStart)) {
        return `Residue ${parsed.resStart} not found in chain "${parsed.chain}"`;
      }

      if (
        parsed.resStart !== parsed.resEnd &&
        !chainResidues.has(parsed.resEnd)
      ) {
        return `End residue ${parsed.resEnd} not found in chain "${parsed.chain}"`;
      }
    }
    return null;
  }

  /** Drives the [externalSelection] input on the Mol* viewer.  Only updated
   *  by manual form input — never by viewer-originated selection — so there
   *  is no circular feedback loop. */
  programmaticViewerSelection = signal<string>("");

  /** Called when the user manually edits the target_hotspot_residues field.
   *  Updates the value, validates against the PDB, and pushes the new
   *  selection string to the Mol* viewer. */
  onHotspotResiduesManualChange(rowId: string, value: unknown): void {
    const residues = (value as string) ?? "";
    this.updateRowValueWithValidation(
      rowId,
      "target_hotspot_residues",
      residues
    );
    this.programmaticViewerSelection.set(residues);
  }

  onSequenceLengthDetected(count: number): void {
    const rowId = this.schemaLoader.inputRows()[0]?.id;
    if (!rowId) return;
    const errorKey = `${rowId}_starting_pdb`;
    const currentErrors = this.formErrors();
    if (count < 50) {
      this.formErrors.set({
        ...currentErrors,
        [errorKey]: `Structure has only ${count} residue(s). Minimum 50 residues required`,
      });
    } else if (count > 300) {
      this.formErrors.set({
        ...currentErrors,
        [errorKey]: `Structure has ${count} residues. Maximum 300 residues allowed`,
      });
    } else {
      const updated = { ...currentErrors };
      delete updated[errorKey];
      this.formErrors.set(updated);
    }
  }

  onLengthRangeChange(
    rowId: string,
    range: { min: number; max: number }
  ): void {
    this.updateRowValueWithValidation(rowId, "min_length", range.min);
    this.updateRowValueWithValidation(rowId, "max_length", range.max);
  }

  /** Called when the user edits the "Number of Trajectories" field. Mirrors
   *  the value into bindflow's number_of_final_designs so the QC-pass target
   *  never gates the run below the requested trajectory count — the run is
   *  bounded to exactly max_trajectories, not an open-ended search for
   *  passing designs. */
  onTrajectoryCountChange(rowId: string, value: unknown): void {
    this.updateRowValueWithValidation(rowId, "max_trajectories", value);
    this.updateRowValueWithValidation(rowId, "number_of_final_designs", value);
  }

  /** "Trajectories" is a BindCraft concept (retry until N pass QC, capped at
   *  max_trajectories) — RFDiffusion has no such loop, it generates exactly
   *  this many designs directly, so the shared field reads differently
   *  per tool. */
  trajectoryFieldLabel(): string {
    return this.selectedTool() === "bindcraft"
      ? "Number of Trajectories"
      : "Number of Final Designs";
  }

  /** Returns the max_trajectories field with its label swapped for the
   *  currently selected tool (see trajectoryFieldLabel). */
  getTrajectoryField(field: InputSchemaField): InputSchemaField {
    return { ...field, label: this.trajectoryFieldLabel() };
  }

  /** Called when the user selects residues in the Mol* viewer. */
  onResiduesSelected(rowId: string, residues: string): void {
    this.updateRowValueWithValidation(
      rowId,
      "target_hotspot_residues",
      residues
    );
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.inputFileName.set(file ? file.name : "");
  }

  // Single-page form sections (rendered + tracked by app-workflow-form)
  readonly sections: WorkflowSection[] = [
    { id: "select-tool", label: "Select a Tool", mobileLabel: "Tool" },
    { id: "input-config", label: "Input Configuration", mobileLabel: "Input" },
    { id: "tool-settings", label: "Tool Settings", mobileLabel: "Settings" },
    { id: "review", label: "Review & Submit", mobileLabel: "Review" },
  ];

  /** Per-section validity — drives the progress-bar colours. */
  isSectionValid = (id: string): boolean => {
    switch (id) {
      case "input-config":
      case "review":
        return this.isFormValid();
      default:
        // select-tool (a tool is always selected) and tool-settings (no params).
        return true;
    }
  };

  private subscription = new Subscription();

  override ngOnInit() {
    // Credit bootstrap lives in the base class.
    super.ngOnInit();

    // Wait for Auth0 to initialize before making HTTP requests
    // Use take(1) and filter to only react once when loading is complete
    this.subscription.add(
      this.auth.isLoading$
        .pipe(
          filter((isLoading) => !isLoading),
          take(1)
        )
        .subscribe(() => {
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

  /** Credit cost of the run: tool multiplier × number of trajectories. */
  readonly creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    if (multiplier == null) return null;
    const rowId = this.schemaLoader.inputRows()[0]?.id;
    if (!rowId) return null;
    const count = this.getRowNumberValue(rowId, "max_trajectories", 0);
    if (!Number.isInteger(count) || count < 1) return null;
    return multiplier * count;
  });

  ngOnDestroy() {
    this.subscription.unsubscribe();
    // Defensive: remove drag listeners if destroyed mid-drag.
    this.document.removeEventListener("mousemove", this.onDocumentMouseMove);
    this.document.removeEventListener("mouseup", this.onDocumentMouseUp);
  }

  loadInputSchema() {
    this.schemaLoader.loadInputSchema(
      this.inputSchemaUrl,
      () => {
        // Success callback: initialize form data
        const defaultValues = this.schemaLoader.generateDefaultValues();

        // max_trajectories is the user-facing "number of trajectories" dial;
        // number_of_final_designs is mirrored to the same value so bindflow's
        // QC-pass target never gates the run below the requested trajectory
        // count (see onTrajectoryCountChange).
        defaultValues["max_trajectories"] = 1;
        defaultValues["number_of_final_designs"] = 1;

        this.initializeFormData(defaultValues);

        // Seed slider bounds from schema defaults so they never change with PDB load.
        if (typeof defaultValues["max_length"] === "number") {
          this.pdbSequenceLength.set(defaultValues["max_length"] as number);
        }
        if (typeof defaultValues["min_length"] === "number") {
          this.pdbSequenceMin.set(defaultValues["min_length"] as number);
        }

        // Initialize table with one default row
        this.schemaLoader.initializeDefaultRow(() => {
          // After row is created, update it with default values
          const rows = this.schemaLoader.inputRows();
          if (rows.length > 0) {
            const firstRowId = rows[0].id;
            this.schemaLoader.updateRowValue(firstRowId, "max_trajectories", 1);
            this.schemaLoader.updateRowValue(
              firstRowId,
              "number_of_final_designs",
              1
            );
          }

          // After row is created, sync to form data
          this.syncRowsToFormData();
        });
      },
      (error) => {
        console.error("Failed to load schema:", error);
      }
    );
  }

  protected validateAll(): void {
    this.form.markAllAsTouched();
    this.validateAllRequiredFields();
    for (const row of this.schemaLoader.inputRows()) {
      this.validateRowField(row.id, "target_hotspot_residues");
    }
  }

  protected performSubmit(): void {
    const file = this.localPdbFile();
    const rowId = this.schemaLoader.inputRows()[0]?.id;

    if (file && rowId && file !== this.uploadedPdbFile()) {
      this.isPdbUploading.set(true);
      this.workflowSubmission.isSubmitting.set(true);
      this.subscription.add(
        this.pdbUploadService
          .uploadPdbFile({
            file,
            folder: this.workflowInputDir,
            metadata: {
              fieldName: "starting_pdb",
              uploadedAt: new Date().toISOString(),
            },
          })
          .subscribe({
            next: (response) => {
              const s3Uri =
                response.s3Uri ??
                response.fileUrl ??
                response.fileId ??
                response.fileName ??
                file.name;
              this.updateRowValueWithValidation(rowId, "starting_pdb", s3Uri);
              this.uploadedPdbFile.set(file);
              this.isPdbUploading.set(false);
              this.doSubmitWorkflow();
            },
            error: (error) => {
              this.isPdbUploading.set(false);
              this.workflowSubmission.isSubmitting.set(false);
              const msg = getErrorMessage(error);
              this.showError(
                `Failed to upload PDB file: ${msg}. Please try again.`
              );
            },
          })
      );
      return;
    }

    this.doSubmitWorkflow();
  }

  /** Sorted, deduplicated chain letters from a residue string like
   *  "A56,B12,B13" -> "A,B" — used only to build the BindCraft submission
   *  payload, not for user-facing chain input. */
  private extractChainsForSubmission(residues: string): string {
    return [
      ...new Set(
        residues
          .split(",")
          .map((r) => r.trim().match(/^([A-Za-z]+)/)?.[1] ?? "")
          .filter(Boolean)
      ),
    ]
      .sort()
      .join(",");
  }

  private doSubmitWorkflow(): void {
    const rawFormData = this.getFormData();
    const formData = {
      ...rawFormData,
      id: this.jobName(),
      sample_id: this.jobName(),
      binder_name: this.jobName(),
      runName: this.jobName(),
    };

    // BindCraft submits a target chain list derived from the selected hotspot
    // residues (deduplicated, e.g. "A12,A13" -> "A"). RFDiffusion doesn't take
    // a chains input at all, so it's omitted from the payload entirely.
    const formDataRecord = formData as Record<string, unknown>;
    if (this.selectedTool() === "bindcraft") {
      const hotspotResidues =
        (formDataRecord["target_hotspot_residues"] as string) ?? "";
      formDataRecord["chains"] =
        this.extractChainsForSubmission(hotspotResidues);
    } else {
      delete formDataRecord["chains"];
    }

    this.workflowSubmission.isSubmitting.set(true);

    // rfdiffusion has no samplesheet - it takes the PDB file directly, so skip
    // the CSV-samplesheet-generating dataset upload and reuse the PDB's own S3
    // URI (already synced into formData.starting_pdb) as the launch's s3InputKey.
    if (this.selectedTool() === "rfdiffusion") {
      const s3InputKey = (formData as Record<string, unknown>)[
        "starting_pdb"
      ] as string | undefined;
      if (!s3InputKey) {
        console.error("No PDB file uploaded for rfdiffusion submission");
        this.workflowSubmission.isSubmitting.set(false);
        this.showError("Please upload a PDB file before submitting.");
        return;
      }

      const workflowFormData: DeNovoDesignPayload = {
        ...formData,
        workflow: "de-novo-design",
        tool: this.selectedTool(),
      };

      this.workflowSubmission.submitWorkflowWithDataset(
        workflowFormData,
        s3InputKey,
        (error) => {
          console.error("Workflow launch failed", error);
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(
            `Workflow launch failed: ${error.message || "Unknown error"}`
          );
        }
      );
      return;
    }

    this.datasetUploadService
      .uploadDataset({
        formData,
      })
      .subscribe({
        next: (response) => {
          const s3InputKey = response.s3Key;

          if (!s3InputKey) {
            console.error("Dataset upload succeeded but no S3 key returned");
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no S3 key was returned."
            );
            return;
          }

          const workflowFormData: DeNovoDesignPayload = {
            ...formData,
            workflow: "de-novo-design",
            tool: this.selectedTool(),
          };

          this.workflowSubmission.submitWorkflowWithDataset(
            workflowFormData,
            s3InputKey,
            (error) => {
              console.error(
                "Workflow launch failed after dataset upload",
                error
              );
              this.workflowSubmission.isSubmitting.set(false);
              this.showError(
                `Workflow launch failed after dataset upload: ${
                  error.message || "Unknown error"
                }`
              );
            }
          );
        },
        error: (error) => {
          console.error("Dataset upload failed", error);
          this.workflowSubmission.isSubmitting.set(false);
          this.showError(`Failed to upload dataset: ${getErrorMessage(error)}`);
        },
      });
  }

  // Initialize form data with default values from schema
  private initializeFormData(defaultValues: Record<string, unknown>): void {
    this.formData.set(defaultValues);
  }

  // Update form data for a specific field
  updateFieldValue(fieldName: string, value: unknown): void {
    const currentData = this.formData();
    const updatedData = { ...currentData, [fieldName]: value };
    this.formData.set(updatedData);
    this.validateField(fieldName, value);
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
  }

  // Validate all required fields and show errors
  private validateAllRequiredFields(): void {
    const requiredFields = this.schemaLoader.requiredInputFields();
    const currentData = this.formData();

    // Validate each required field to show specific errors
    for (const field of requiredFields) {
      if (
        field.name === "binder_name" ||
        field.name === "id" ||
        field.name === "chains"
      )
        continue;
      const value = currentData[field.name];
      this.validateField(field.name, value);
    }
    this.form.markAllAsTouched();
  }

  // Get current form data for submission
  getFormData(): Record<string, unknown> {
    // Get current form data from UI fields
    const currentData = this.formData();

    // Get optional fields with their default values
    const optionalFields = this.schemaLoader.optionalInputFields();
    const optionalDefaults: Record<string, unknown> = {};

    optionalFields.forEach((field) => {
      // Only add if not already in form data
      if (!(field.name in currentData)) {
        if (field.default !== undefined) {
          optionalDefaults[field.name] = field.default;
        } else {
          // Use type-based defaults
          switch (field.type) {
            case "string":
              optionalDefaults[field.name] = "";
              break;
            case "number":
              optionalDefaults[field.name] = field.validation?.min || 0;
              break;
            case "boolean":
              optionalDefaults[field.name] = false;
              break;
            case "array":
              optionalDefaults[field.name] = [];
              break;
            case "object":
              optionalDefaults[field.name] = {};
              break;
            default:
              optionalDefaults[field.name] = "";
          }
        }
      }
    });

    // Merge current data with optional defaults (without pipeline)
    return {
      ...optionalDefaults,
      ...currentData,
    };
  }

  // Form summary for step 3
  formSummary = computed(() => {
    const data = this.formData();
    const fields = this.schemaLoader.inputSchemaFields();
    const localPdb = this.localPdbFile();
    const summary: {
      label: string;
      value: string;
      fieldName: string;
      url?: string;
    }[] = [];

    // Fields to exclude from summary
    const excludedFields = [
      "settings_filters",
      "settings_advanced",
      "binder_name",
      "id",
      "chains",
      // Mirrored from max_trajectories (see onTrajectoryCountChange) —
      // showing both would duplicate the same value under two labels.
      "number_of_final_designs",
    ];

    fields.forEach((field) => {
      // Skip excluded fields
      if (excludedFields.includes(field.name)) {
        return;
      }

      const value = data[field.name];
      const isEmpty = value === undefined || value === null || value === "";
      let displayValue = "";
      let downloadUrl: string | undefined;

      if (!isEmpty) {
        displayValue = String(value);

        if (field.name === "starting_pdb") {
          // Show only the filename; optionally link to the file if it's an HTTP URL.
          const rawPath = String(value);
          displayValue = localPdb?.name ?? this.extractFilename(rawPath);
          downloadUrl = rawPath.startsWith("http") ? rawPath : undefined;
        } else if (field.type === "boolean") {
          displayValue = value ? "Yes" : "No";
        } else if (field.type === "number") {
          displayValue = String(value);
        } else if (Array.isArray(value)) {
          displayValue = value.join(", ");
        } else if (typeof value === "object") {
          displayValue = JSON.stringify(value);
        }
      } else if (localPdb && field.name === "starting_pdb") {
        // A file is staged locally but not yet reflected in the form data.
        displayValue = localPdb.name;
      }

      summary.push({
        label:
          field.name === "max_trajectories"
            ? this.trajectoryFieldLabel()
            : field.label || field.name,
        value: displayValue,
        fieldName: field.name,
        ...(downloadUrl ? { url: downloadUrl } : {}),
      });
    });

    summary.unshift({
      label: "Job Name",
      value: this.jobName(),
      fieldName: "id",
    });

    return summary;
  });

  /** Extract just the filename from a path, S3 URI, or HTTP URL. */
  private extractFilename(path: string): string {
    if (!path) return path;
    const parts = path.split(/[/\\?#]/);
    return parts.filter((p) => p.length > 0).pop() ?? path;
  }

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
      defaultValues["max_trajectories"] = 1;
      defaultValues["number_of_final_designs"] = 1;
      this.initializeFormData(defaultValues);
    }
  }

  // Sync all row data to formData for validation system
  private syncRowsToFormData(): void {
    const rowValues = this.schemaLoader.getFirstRowValues();
    if (Object.keys(rowValues).length > 0) {
      // Preserve existing formData (like default URLs) and merge with row values
      const currentData = this.formData();
      this.formData.set({ ...currentData, ...rowValues });
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

  getRowNumberValue(
    rowId: string,
    fieldName: string,
    defaultVal: number
  ): number {
    const val = this.getRowValue(rowId, fieldName);
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val !== "") {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
    return defaultVal;
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
      // Custom field-level validators (PDB-aware).
      let customError: string | null = null;
      if (fieldName === "target_hotspot_residues") {
        customError = this.validateHotspotResidues(value as string);
      }
      if (customError) {
        this.formErrors.set({ ...currentErrors, [errorKey]: customError });
        return;
      }
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

  /** Returns true when any field inside the collapsible config section has a validation error. */
  hasConfigSectionErrors(rowId: string): boolean {
    if (this.hasJobNameError()) return true;
    return ["target_hotspot_residues", "min_length", "max_length"].some((f) =>
      this.hasRowFieldError(rowId, f)
    );
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
