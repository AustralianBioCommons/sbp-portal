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

import { startWith, Subscription } from "rxjs";
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

/** Overall bounds offered by the length-range slider. */
const PDB_SEQUENCE_MIN = 65;
const PDB_SEQUENCE_MAX = 150;

/** Default binder length range, mirroring the bindflow pipeline's own defaults. */
const DEFAULT_MIN_LENGTH = 65;
const DEFAULT_MAX_LENGTH = 150;

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
  implements OnDestroy
{
  // Document reference (SSR-safe; avoids touching the global directly)
  private readonly document = inject(DOCUMENT);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // PDB upload service
  private pdbUploadService = inject(PdbUploadService);

  protected readonly workflowCategory = "de-novo-design" as const;

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

  // Field-level validation errors, keyed by field name.
  formErrors = signal<{ [key: string]: string }>({});

  getFieldError(fieldName: string): string | null {
    return this.formErrors()[fieldName] || null;
  }

  hasFieldError(fieldName: string): boolean {
    return this.getFieldError(fieldName) !== null;
  }

  /** Returns true when any field inside the collapsible config section has a validation error. */
  hasConfigSectionErrors(): boolean {
    if (this.hasJobNameError()) return true;
    return (
      this.hasFieldError("target_hotspot_residues") ||
      this.hasFieldError("starting_pdb")
    );
  }

  readonly isFormValid = computed<boolean>(() => {
    this.jobName();
    if (this.form.controls.jobName.invalid) return false;
    if (Object.keys(this.formErrors()).length > 0) return false;
    if (!this.startingPdb()) return false;
    if (!this.targetHotspotResidues().trim()) return false;
    const designs = this.numberOfDesigns();
    if (!Number.isInteger(designs) || designs < 1) return false;
    return true;
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

  // Step 1: Input configuration

  /** Raw local File for the starting_pdb field – shown in Mol* viewer immediately.
   *  Actual upload to S3 is deferred until the user clicks Next. */
  localPdbFile = signal<File | null>(null);

  /** Parsed chain → residue-number set from the loaded PDB.  Populated
   *  asynchronously after the user picks a file; null until then. */
  pdbResidueMap = signal<Map<string, Set<number>> | null>(null);

  /** Reference to the File object that was last successfully uploaded.
   *  Used to skip re-upload when the user navigates Back then Next again. */
  private uploadedPdbFile = signal<File | null>(null);

  /** Value submitted as `starting_pdb` — the local filename until upload,
   *  then the S3 URI returned by the upload. */
  startingPdb = signal<string>("");

  /** True while the PDB file is being uploaded to S3 on Next click. */
  isPdbUploading = signal(false);

  /** Comma-separated chain+residue tokens, e.g. "A56,A57". */
  targetHotspotResidues = signal<string>("");

  /** Binder length range (residues). */
  minLength = signal<number>(DEFAULT_MIN_LENGTH);
  maxLength = signal<number>(DEFAULT_MAX_LENGTH);

  /** Overall bounds offered by the length-range slider. */
  readonly pdbSequenceMin = PDB_SEQUENCE_MIN;
  readonly pdbSequenceLength = PDB_SEQUENCE_MAX;

  /** Number of designs — mirrored into both max_trajectories and
   *  number_of_final_designs (see onNumberOfDesignsChange). */
  numberOfDesigns = signal<number>(1);

  /** Static field descriptor for the hotspot residues input, rendered via app-form-field. */
  readonly hotspotResiduesField: InputSchemaField = {
    name: "target_hotspot_residues",
    type: "string",
    label: "Target Hotspot Residues",
    required: true,
  };

  /** Static field descriptor for the number-of-designs input, shared by both
   *  tools now that BindCraft generates exactly this many designs directly,
   *  the same as RFDiffusion. */
  readonly numberOfDesignsField: InputSchemaField = {
    name: "max_trajectories",
    type: "number",
    label: "Number of Designs",
    required: true,
    validation: { integer: true, min: 1 },
  };

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
   *  Sets the local viewer file and marks the field value with the
   *  filename so required validation passes before the real upload. */
  onPdbFilePicked(file: File): void {
    const validation = this.pdbUploadService.validatePdbFile(file);
    if (!validation.valid) {
      this.showError(validation.error ?? "Invalid PDB file.");
      return;
    }
    // If replacing an existing file, clear only structure-derived fields;
    // min_length, max_length stay at their current values.
    if (this.localPdbFile()) {
      this.targetHotspotResidues.set("");
      this.programmaticViewerSelection.set("");
    }
    this.localPdbFile.set(file);
    // New file picked — reset upload tracking so Next will upload this file.
    this.uploadedPdbFile.set(null);
    // Use filename as placeholder value so required validation passes.
    this.startingPdb.set(file.name);
    this.validateStartingPdbField();
  }

  clearLocalPdb(): void {
    this.localPdbFile.set(null);
    this.uploadedPdbFile.set(null);
    this.pdbResidueMap.set(null);
    this.programmaticViewerSelection.set("");
    this.startingPdb.set("");
    this.targetHotspotResidues.set("");
    this.validateStartingPdbField();
    this.validateHotspotResiduesField();
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
  onHotspotResiduesManualChange(value: unknown): void {
    const residues = (value as string) ?? "";
    this.targetHotspotResidues.set(residues);
    this.validateHotspotResiduesField();
    this.programmaticViewerSelection.set(residues);
  }

  onLengthRangeChange(range: { min: number; max: number }): void {
    this.minLength.set(range.min);
    this.maxLength.set(range.max);
  }

  /** Called when the user edits the "Number of Designs" field. Mirrors the
   *  value into bindflow's number_of_final_designs so the QC-pass target
   *  never gates the run below the requested count — the run is bounded to
   *  exactly this many, not an open-ended search for passing designs. */
  onNumberOfDesignsChange(value: unknown): void {
    const num = typeof value === "number" ? value : Number(value);
    this.numberOfDesigns.set(Number.isFinite(num) ? num : 0);
    this.validateNumberOfDesignsField();
  }

  /** Called when the user selects residues in the Mol* viewer. */
  onResiduesSelected(residues: string): void {
    this.targetHotspotResidues.set(residues);
    this.validateHotspotResiduesField();
  }

  onSequenceLengthDetected(count: number): void {
    const currentErrors = this.formErrors();
    if (count < 50) {
      this.formErrors.set({
        ...currentErrors,
        starting_pdb: `The target structure must be between 50 and 300 amino acids. This structure has ${count} amino acids. Please upload a larger structure.`,
      });
    } else if (count > 300) {
      this.formErrors.set({
        ...currentErrors,
        starting_pdb: `The target structure must be between 50 and 300 amino acids. This structure has ${count} amino acids. Please upload a smaller structure. Structures can be trimmed using PyMOL or ChimeraX to satisfy the size limit.`,
      });
    } else {
      const updated = { ...currentErrors };
      delete updated["starting_pdb"];
      this.formErrors.set(updated);
    }
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

  /** Credit cost of the run: tool multiplier × number of designs. */
  readonly creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    if (multiplier == null) return null;
    const count = this.numberOfDesigns();
    if (!Number.isInteger(count) || count < 1) return null;
    return multiplier * count;
  });

  ngOnDestroy() {
    this.subscription.unsubscribe();
    // Defensive: remove drag listeners if destroyed mid-drag.
    this.document.removeEventListener("mousemove", this.onDocumentMouseMove);
    this.document.removeEventListener("mouseup", this.onDocumentMouseUp);
  }

  protected validateAll(): void {
    this.form.markAllAsTouched();
    this.validateStartingPdbField();
    this.validateHotspotResiduesField();
    this.validateNumberOfDesignsField();
  }

  private validateStartingPdbField(): void {
    if (this.startingPdb()) return;
    this.formErrors.set({
      ...this.formErrors(),
      starting_pdb: "Target PDB file is required",
    });
  }

  validateHotspotResiduesField(): void {
    const value = this.targetHotspotResidues();
    const errors = { ...this.formErrors() };
    if (!value.trim()) {
      errors["target_hotspot_residues"] = "Target Hotspot Residues is required";
    } else {
      const customError = this.validateHotspotResidues(value);
      if (customError) {
        errors["target_hotspot_residues"] = customError;
      } else {
        delete errors["target_hotspot_residues"];
      }
    }
    this.formErrors.set(errors);
  }

  validateNumberOfDesignsField(): void {
    const value = this.numberOfDesigns();
    const errors = { ...this.formErrors() };
    if (!Number.isInteger(value) || value < 1) {
      errors[
        "max_trajectories"
      ] = `${this.numberOfDesignsField.label} must be a whole number of at least 1`;
    } else {
      delete errors["max_trajectories"];
    }
    this.formErrors.set(errors);
  }

  protected performSubmit(): void {
    const file = this.localPdbFile();

    if (file && file !== this.uploadedPdbFile()) {
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
              this.startingPdb.set(s3Uri);
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
    const jobName = this.jobName();
    const numberOfDesigns = this.numberOfDesigns();
    const formData: Record<string, unknown> = {
      id: jobName,
      sample_id: jobName,
      binder_name: jobName,
      runName: jobName,
      starting_pdb: this.startingPdb(),
      target_hotspot_residues: this.targetHotspotResidues(),
      min_length: this.minLength(),
      max_length: this.maxLength(),
      max_trajectories: numberOfDesigns,
      number_of_final_designs: numberOfDesigns,
    };

    // BindCraft submits a target chain list derived from the selected hotspot
    // residues (deduplicated, e.g. "A12,A13" -> "A"). RFDiffusion doesn't take
    // a chains input at all, so it's omitted from the payload entirely.
    if (this.selectedTool() === "bindcraft") {
      formData["chains"] = this.extractChainsForSubmission(
        this.targetHotspotResidues()
      );
    }

    this.workflowSubmission.isSubmitting.set(true);

    // rfdiffusion has no samplesheet - it takes the PDB file directly, so skip
    // the CSV-samplesheet-generating dataset upload and reuse the PDB's own S3
    // URI (already synced into formData.starting_pdb) as the launch's s3InputKey.
    if (this.selectedTool() === "rfdiffusion") {
      const s3InputKey = formData["starting_pdb"] as string | undefined;
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
      } as DeNovoDesignPayload;

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
          } as DeNovoDesignPayload;

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

  /** Extract just the filename from a path, S3 URI, or HTTP URL. */
  private extractFilename(path: string): string {
    if (!path) return path;
    const parts = path.split(/[/\\?#]/);
    return parts.filter((p) => p.length > 0).pop() ?? path;
  }

  // Form summary for the review step
  formSummary = computed(() => {
    const localPdb = this.localPdbFile();
    const startingPdbValue = this.startingPdb();
    const summary: {
      label: string;
      value: string;
      fieldName: string;
      url?: string;
    }[] = [];

    let pdbDisplayValue = "";
    let pdbUrl: string | undefined;
    if (localPdb) {
      pdbDisplayValue = localPdb.name;
    } else if (startingPdbValue) {
      pdbDisplayValue = this.extractFilename(startingPdbValue);
      pdbUrl = startingPdbValue.startsWith("http")
        ? startingPdbValue
        : undefined;
    }

    summary.push({
      label: "Job Name",
      value: this.jobName(),
      fieldName: "id",
    });
    summary.push({
      label: "Target PDB",
      value: pdbDisplayValue,
      fieldName: "starting_pdb",
      ...(pdbUrl ? { url: pdbUrl } : {}),
    });
    summary.push({
      label: "Target Hotspot Residues",
      value: this.targetHotspotResidues(),
      fieldName: "target_hotspot_residues",
    });
    summary.push({
      label: "Binder Length Range",
      value: `${this.minLength()} - ${this.maxLength()}`,
      fieldName: "length_range",
    });
    summary.push({
      label: this.numberOfDesignsField.label,
      value: String(this.numberOfDesigns()),
      fieldName: "max_trajectories",
    });

    return summary;
  });
}
