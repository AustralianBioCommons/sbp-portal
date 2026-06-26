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
  viewChild,
} from "@angular/core";
import { FormControl, FormsModule } from "@angular/forms";
import {
  JOB_NAME_VALIDATORS,
  jobNameErrorMessage,
} from "../../../cores/utils/job-name.utils";
import { ButtonComponent } from "../../../components/button/button.component";
import { MolstarViewerComponent } from "../../../components/workflow/molstar-viewer/molstar-viewer.component";
import { LengthRangeSliderComponent } from "../../../components/workflow/length-range-slider/length-range-slider.component";

import { filter, Subscription, take } from "rxjs";
import { ConfigurationSummaryComponent } from "../../../components/workflow/configuration-summary/configuration-summary.component";
import { FormFieldComponent } from "../../../components/workflow/form-field/form-field.component";
import { StepContentComponent } from "../../../components/workflow/step-content/step-content.component";
import { WorkflowLayoutComponent } from "../../../layouts/workflow-layout/workflow-layout.component";
import {
  WorkflowFormComponent,
  WorkflowSection,
} from "../../../components/workflow/workflow-form/workflow-form.component";
import {
  ToolOption,
  ToolSelectionComponent,
} from "../../../components/workflow/tool-selection/tool-selection.component";
import { CreditSummaryComponent } from "../../../components/workflow/credit-summary/credit-summary.component";
import { AuthService } from "../../../cores/auth.service";
import {
  CreditsService,
  USER_CREDITS_ENABLED,
} from "../../../cores/services/credits.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { PdbUploadService } from "../../../cores/services/pdb-upload.service";
import { SchemaLoaderService } from "../../../cores/services/schema-loader.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import { WORKFLOW_INPUT_DIRS } from "../../../cores/config/workflow-paths";
import { getErrorMessage } from "../../../cores/utils/error.utils";
import {
  DeNovoDesignPayload,
  WorkflowTool,
} from "../../../cores/interfaces/workflow.interfaces";

interface ToolChip extends ToolOption {
  id: Extract<WorkflowTool, "bindcraft" | "rfdiffusion">;
}

@Component({
  selector: "app-de-novo-design",
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    ToolSelectionComponent,
    WorkflowFormComponent,
    WorkflowLayoutComponent,
    StepContentComponent,
    FormFieldComponent,
    ConfigurationSummaryComponent,
    MolstarViewerComponent,
    LengthRangeSliderComponent,
    CreditSummaryComponent,
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
export default class DeNovoDesignComponent implements OnInit, OnDestroy {
  private readonly availableToolId: ToolChip["id"] = "bindcraft";

  // // Make Object available in template
  Object = Object;

  // Document reference (SSR-safe; avoids touching the global directly)
  private readonly document = inject(DOCUMENT);
  // Auth
  public auth = inject(AuthService);
  // Schema loader service
  public schemaLoader = inject(SchemaLoaderService);
  // Workflow submission service
  public workflowSubmission = inject(WorkflowSubmissionService);
  // Dataset upload service
  private datasetUploadService = inject(DatasetUploadService);
  // PDB upload service
  private pdbUploadService = inject(PdbUploadService);
  // Credits service (per-tool credit multipliers)
  private creditsService = inject(CreditsService);
  readonly creditsEnabled = USER_CREDITS_ENABLED;

  // Alert state
  showAlert = signal(false);
  alertMessage = signal("");

  // Schema URLs for bindflow workflow
  private readonly inputSchemaUrl =
    "https://raw.githubusercontent.com/Australian-Structural-Biology-Computing/bindflow/refs/heads/dev/assets/schema_input.json";

  // Job Name (custom signal-based field, replaces schema 'id' field in UI)
  jobName = signal("");
  jobNameTouched = signal(false);
  readonly jobNameError = computed<string>(() =>
    jobNameErrorMessage(
      new FormControl(this.jobName().trim(), JOB_NAME_VALIDATORS).errors
    )
  );

  // Form data and validation
  formData = signal<Record<string, unknown>>({});
  formErrors = signal<{ [key: string]: string }>({});
  isFormValid = signal<boolean>(false);

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
  readonly unavailableToolLabels: string[] = this.tools
    .filter((tool) => tool.id !== this.availableToolId)
    .map((tool) => tool.label);
  selectedTool = signal<ToolChip["id"]>("bindcraft");
  isToolSelected = (id: ToolChip["id"]) => this.selectedTool() === id;
  isToolAvailable = (id: ToolChip["id"]) => id === this.availableToolId;
  selectTool(id: ToolChip["id"]) {
    if (!this.isToolAvailable(id)) {
      const label = this.tools.find((tool) => tool.id === id)?.label ?? id;
      this.showError(`${label} is not available yet. Please use BindCraft.`);
      this.selectedTool.set(this.availableToolId);
      return;
    }
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
  readonly defaultPanelWidth = 360;
  /** Minimum width (px) of the config panel while open — the divider drag
   *  cannot shrink it below this; below it the panel can only be fully closed (0). */
  readonly minPanelWidth = 240;
  /** Maximum width (px) the config panel can be dragged to. */
  readonly maxPanelWidth = 600;

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
      this.updateRowValue(rowId, "chains", "");
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
    this.updateRowValueWithValidation(rowId, "chains", "");
    this.updateRowValueWithValidation(rowId, "target_hotspot_residues", "");
  }

  /** Return sorted, deduplicated chain letters from a residue string like "A56,B12-B20". */
  private chainsFromResidues(residues: string): string {
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

  /** Receives the chain→residue map emitted by the Mol* viewer after it
   *  parses the PDB structure — no need to re-parse the file ourselves. */
  onStructureResiduesDetected(residues: Map<string, Set<number>>): void {
    this.pdbResidueMap.set(residues.size > 0 ? residues : null);
  }

  private validateChains(rowId: string, value: string): string | null {
    if (!value?.trim()) return null;
    const tokens = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      if (!/^[A-Za-z]+$/.test(token)) {
        return `Invalid chain "${token}". Use letter identifiers only, e.g. "A" or "A,B".`;
      }
    }

    const residueMap = this.pdbResidueMap();
    if (residueMap) {
      for (const token of tokens) {
        if (!residueMap.has(token)) {
          return `Chain "${token}" not found in PDB. Available: ${[
            ...residueMap.keys(),
          ]
            .sort()
            .join(", ")}.`;
        }
      }
    }

    const hotspot =
      (this.getRowValue(rowId, "target_hotspot_residues") as string) ?? "";
    if (hotspot.trim()) {
      const chainsSet = new Set(tokens);
      for (const hChain of this.chainsFromResidues(hotspot)
        .split(",")
        .filter(Boolean)) {
        if (!chainsSet.has(hChain)) {
          return `Chain "${hChain}" is used in Target Hotspot Residues but not listed in Chains.`;
        }
      }
    }
    return null;
  }

  private validateHotspotResidues(value: string): string | null {
    if (!value?.trim()) return null;
    const residueMap = this.pdbResidueMap();

    for (const token of value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)) {
      const parsed = MolstarViewerComponent.parseResidueToken(token);
      if (!parsed) {
        return `Invalid format "${token}". Use chain+residue notation, e.g. "A56" or "A12-A14".`;
      }
      if (!residueMap) continue;

      const chainResidues = residueMap.get(parsed.chain);
      if (!chainResidues) {
        return `Chain "${parsed.chain}" not found in PDB. Available: ${[
          ...residueMap.keys(),
        ]
          .sort()
          .join(", ")}.`;
      }
      if (!chainResidues.has(parsed.resStart)) {
        return `Residue ${parsed.resStart} not found in chain "${parsed.chain}".`;
      }
      if (
        parsed.resStart !== parsed.resEnd &&
        !chainResidues.has(parsed.resEnd)
      ) {
        return `End residue ${parsed.resEnd} not found in chain "${parsed.chain}".`;
      }
    }
    return null;
  }

  /** Drives the [externalSelection] input on the Mol* viewer.  Only updated
   *  by manual form input — never by viewer-originated selection — so there
   *  is no circular feedback loop. */
  programmaticViewerSelection = signal<string>("");

  /** Called when the user manually edits the target_hotspot_residues field.
   *  Updates the value, auto-derives chains, validates against the PDB, and
   *  pushes the new selection string to the Mol* viewer. */
  onHotspotResiduesManualChange(rowId: string, value: unknown): void {
    const residues = (value as string) ?? "";
    this.updateRowValueWithValidation(
      rowId,
      "target_hotspot_residues",
      residues
    );
    const chains = this.chainsFromResidues(residues);
    if (chains) this.updateRowValueWithValidation(rowId, "chains", chains);
    this.programmaticViewerSelection.set(residues);
  }

  onChainsDetected(rowId: string, chains: string): void {
    this.updateRowValueWithValidation(rowId, "chains", chains);
  }

  onSequenceLengthDetected(count: number): void {
    const rowId = this.schemaLoader.inputRows()[0]?.id;
    if (!rowId) return;
    const errorKey = `${rowId}_starting_pdb`;
    const currentErrors = this.formErrors();
    if (count < 50) {
      this.formErrors.set({
        ...currentErrors,
        [errorKey]: `Structure has only ${count} residue(s). Minimum 50 residues required.`,
      });
    } else if (count > 300) {
      this.formErrors.set({
        ...currentErrors,
        [errorKey]: `Structure has ${count} residues. Maximum 300 residues allowed.`,
      });
    } else {
      const updated = { ...currentErrors };
      delete updated[errorKey];
      this.formErrors.set(updated);
    }
    this.validateAllRows();
  }

  onLengthRangeChange(
    rowId: string,
    range: { min: number; max: number }
  ): void {
    this.updateRowValueWithValidation(rowId, "min_length", range.min);
    this.updateRowValueWithValidation(rowId, "max_length", range.max);
  }

  /** Called when the user selects residues in the Mol* viewer.
   *  Also derives the unique chain letters (first char of each token)
   *  and auto-fills the chains field. e.g. "A56,B12" → chains = "A,B".
   */
  onResiduesSelected(rowId: string, residues: string): void {
    this.updateRowValueWithValidation(
      rowId,
      "target_hotspot_residues",
      residues
    );
    const chains = this.chainsFromResidues(residues);
    this.updateRowValueWithValidation(rowId, "chains", chains);
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

  /** Reference to the workflow-form shell, used to scroll to invalid sections. */
  private readonly workflowForm = viewChild(WorkflowFormComponent);

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

  ngOnInit() {
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

    if (this.creditsEnabled) {
      // Only call the credit service once the user is authenticated; the
      // /api/* requests require a bearer token and otherwise fail, blocking
      // the page from rendering.
      this.subscription.add(
        this.auth.isAuthenticated$
          .pipe(filter(Boolean), take(1))
          .subscribe(() => this.loadToolCredits())
      );
    }
  }

  /** Per-tool credit multipliers for this workflow (from the backend). */
  private toolMultipliers = signal<Partial<Record<ToolChip["id"], number>>>({});
  /**
   * Remaining credit balance for the current user. Starts at 0 until the real
   * balance from getMyCredit() loads.
   */
  creditsRemaining = signal<number | null>(0);

  /** Credit cost of the run: tool multiplier × number of final designs. */
  creditCost = computed<number | null>(() => {
    const multiplier = this.toolMultipliers()[this.selectedTool()];
    if (multiplier == null) return null;
    const rowId = this.schemaLoader.inputRows()[0]?.id;
    if (!rowId) return null;
    const count = this.getRowNumberValue(rowId, "number_of_final_designs", 0);
    if (!Number.isFinite(count) || count < 1) return null;
    return multiplier * count;
  });

  /** True when the run's cost is known to exceed the user's remaining balance. */
  creditsInsufficient = computed<boolean>(() => {
    const cost = this.creditCost();
    const remaining = this.creditsRemaining();
    return cost !== null && remaining !== null && cost > remaining;
  });

  /** Fetch per-tool credit multipliers and the user's remaining balance. */
  private loadToolCredits(): void {
    this.subscription.add(
      this.creditsService.getWorkflowCredits().subscribe({
        next: (response) => {
          const config = response.workflows.find(
            (w) => w.category === "de-novo-design"
          );
          if (!config) return;
          this.toolMultipliers.set(config.toolMultipliers);
          for (const tool of this.tools) {
            const multiplier = config.toolMultipliers[tool.id];
            if (multiplier != null) {
              tool.credits = multiplier;
            }
          }
        },
        error: (error) => {
          console.warn("Failed to load workflow credits", error);
        },
      })
    );
    this.subscription.add(
      this.creditsService.getMyCredit().subscribe({
        next: (response) => this.creditsRemaining.set(response.credit),
        error: (error) => {
          console.warn("Failed to load credit balance", error);
        },
      })
    );
  }

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

        // Add default URLs for settings fields
        defaultValues.settings_filters =
          "https://raw.githubusercontent.com/Australian-Structural-Biology-Computing/bindflow/refs/heads/dev/assets/bindcraft/default_filters.json";
        defaultValues.settings_advanced =
          "https://raw.githubusercontent.com/Australian-Structural-Biology-Computing/bindflow/refs/heads/dev/assets/bindcraft/default_4stage_multimer.json";
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
          // After row is created, update it with default URLs
          const rows = this.schemaLoader.inputRows();
          if (rows.length > 0) {
            const firstRowId = rows[0].id;
            this.schemaLoader.updateRowValue(
              firstRowId,
              "settings_filters",
              defaultValues.settings_filters
            );
            this.schemaLoader.updateRowValue(
              firstRowId,
              "settings_advanced",
              defaultValues.settings_advanced
            );
            this.schemaLoader.updateRowValue(
              firstRowId,
              "number_of_final_designs",
              1
            );
          }

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
    // Run full validation (previously triggered by Next on the input step).
    this.jobNameTouched.set(true);
    this.validateAllRequiredFields();
    for (const row of this.schemaLoader.inputRows()) {
      this.validateRowField(row.id, "target_hotspot_residues");
      this.validateRowField(row.id, "chains");
    }
    this.validateForm();

    if (!this.isFormValid()) {
      this.workflowForm()?.scrollToFirstInvalidSection();
      return;
    }

    const file = this.localPdbFile();
    const rowId = this.schemaLoader.inputRows()[0]?.id;

    if (file && rowId && file !== this.uploadedPdbFile()) {
      this.isPdbUploading.set(true);
      this.workflowSubmission.isSubmitting.set(true);
      this.subscription.add(
        this.pdbUploadService
          .uploadPdbFile({
            file,
            folder: WORKFLOW_INPUT_DIRS.DE_NOVO_DESIGN,
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

  private doSubmitWorkflow(): void {
    const rawFormData = this.getFormData();
    const formData = {
      ...rawFormData,
      id: this.jobName(),
      sample_id: this.jobName(),
      binder_name: this.jobName(),
      runName: this.jobName(),
    };

    this.workflowSubmission.isSubmitting.set(true);

    this.datasetUploadService
      .uploadDataset({
        formData,
      })
      .subscribe({
        next: (response) => {
          const datasetId = response.datasetId;

          if (!datasetId) {
            console.error("Dataset upload succeeded but no datasetId returned");
            this.workflowSubmission.isSubmitting.set(false);
            this.showError(
              "Dataset upload succeeded but no dataset ID was returned."
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
            datasetId,
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

  closeAlert(): void {
    this.showAlert.set(false);
    this.alertMessage.set("");
  }

  private showError(message: string): void {
    this.alertMessage.set(message);
    this.showAlert.set(true);
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

  onJobNameChange(value: string): void {
    this.jobName.set(value);
    this.validateAllRows();
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
      if (field.name === "binder_name" || field.name === "id") continue;
      const value = currentData[field.name];
      this.validateField(field.name, value);
    }
    this.jobNameTouched.set(true);
  }

  // Validate the entire form
  private validateForm(): void {
    const requiredFields = this.schemaLoader.requiredInputFields();
    const currentData = this.formData();

    let isValid = true;

    // Check if all required fields have values
    for (const field of requiredFields) {
      if (field.name === "binder_name" || field.name === "id") continue;
      const value = currentData[field.name];
      if (value === undefined || value === null || value === "") {
        isValid = false;
        break;
      }
    }

    // Check Job Name validity
    if (this.jobNameError()) {
      isValid = false;
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
        label: field.label || field.name,
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
      } else if (fieldName === "chains") {
        customError = this.validateChains(rowId, value as string);
      }
      if (customError) {
        this.formErrors.set({ ...currentErrors, [errorKey]: customError });
        this.validateAllRows();
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
        if (field.name === "binder_name" || field.name === "id") continue;
        const value = row.values[field.name];
        if (value === undefined || value === null || value === "") {
          hasErrors = true;
          break;
        }
      }
      if (hasErrors) break;
    }

    // Check Job Name validity
    if (this.jobNameError()) {
      hasErrors = true;
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

  /** Returns true when any field inside the collapsible config section has a validation error. */
  hasConfigSectionErrors(rowId: string): boolean {
    if (this.jobNameTouched() && !!this.jobNameError()) return true;
    return [
      "target_hotspot_residues",
      "chains",
      "min_length",
      "max_length",
    ].some((f) => this.hasRowFieldError(rowId, f));
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
