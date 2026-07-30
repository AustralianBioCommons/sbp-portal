import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Observable, of, throwError } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import { CreditsService } from "../../../core/services/credits.service";
import { DatasetUploadService } from "../services/dataset-upload.service";
import { PdbUploadService } from "../services/pdb-upload.service";
import {
  InputRow,
  SchemaLoaderService,
} from "../services/schema-loader.service";
import { InputSchemaField } from "../services/input-schema.service";
import { WorkflowSubmissionService } from "../services/workflow-submission.service";
import DeNovoDesignComponent from "./de-novo-design";

function requiredField(name: string): InputSchemaField {
  return { name } as unknown as InputSchemaField;
}

function field(partial: Partial<InputSchemaField>): InputSchemaField {
  return { name: "unnamed", type: "string", ...partial } as InputSchemaField;
}

function rowWith(values: Record<string, unknown>): InputRow {
  return { id: "row1", values };
}

describe("DeNovoDesignComponent", () => {
  let component: DeNovoDesignComponent;
  let fixture: ComponentFixture<DeNovoDesignComponent>;
  let schemaLoader: {
    inputSchemaData: ReturnType<typeof signal<unknown>>;
    inputSchemaFields: ReturnType<typeof signal<InputSchemaField[]>>;
    requiredInputFields: ReturnType<typeof signal<InputSchemaField[]>>;
    optionalInputFields: ReturnType<typeof signal<InputSchemaField[]>>;
    inputRows: ReturnType<typeof signal<InputRow[]>>;
    loadInputSchema: jasmine.Spy;
    initializeDefaultRow: jasmine.Spy;
    generateDefaultValues: jasmine.Spy;
    getFirstRowValues: jasmine.Spy;
    getRowValue: jasmine.Spy;
    updateRowValue: jasmine.Spy;
    inputSchemaService: { validateFieldValue: jasmine.Spy };
  };
  let datasetUpload: jasmine.SpyObj<DatasetUploadService>;
  let pdbUpload: jasmine.SpyObj<PdbUploadService>;
  let workflowSubmission: {
    isSubmitting: ReturnType<typeof signal<boolean>>;
    showSuccessDialog: ReturnType<typeof signal<boolean>>;
    successDialogData: ReturnType<typeof signal<unknown>>;
    submitWorkflowWithDataset: jasmine.Spy;
    goToJobs: jasmine.Spy;
  };
  let credits: jasmine.SpyObj<CreditsService>;

  beforeEach(async () => {
    schemaLoader = {
      inputSchemaData: signal<unknown>(null),
      inputSchemaFields: signal<InputSchemaField[]>([]),
      requiredInputFields: signal<InputSchemaField[]>([]),
      optionalInputFields: signal<InputSchemaField[]>([]),
      inputRows: signal<InputRow[]>([]),
      loadInputSchema: jasmine.createSpy("loadInputSchema"),
      initializeDefaultRow: jasmine.createSpy("initializeDefaultRow"),
      generateDefaultValues: jasmine
        .createSpy("generateDefaultValues")
        .and.returnValue({}),
      getFirstRowValues: jasmine
        .createSpy("getFirstRowValues")
        .and.callFake(() => {
          const rows = schemaLoader.inputRows();
          return rows.length ? { ...rows[0].values } : {};
        }),
      getRowValue: jasmine
        .createSpy("getRowValue")
        .and.callFake((rowId: string, name: string) => {
          const row = schemaLoader.inputRows().find((r) => r.id === rowId);
          return row?.values[name] ?? "";
        }),
      updateRowValue: jasmine
        .createSpy("updateRowValue")
        .and.callFake((rowId: string, name: string, value: unknown) => {
          schemaLoader.inputRows.update((rows) =>
            rows.map((r) =>
              r.id === rowId
                ? { ...r, values: { ...r.values, [name]: value } }
                : r
            )
          );
        }),
      inputSchemaService: {
        validateFieldValue: jasmine
          .createSpy("validateFieldValue")
          .and.returnValue({ valid: true, errors: [] }),
      },
    };

    const authService: {
      isAuthenticated$: Observable<boolean>;
      isLoading$: Observable<boolean>;
      canExecuteWorkflows$: Observable<boolean>;
      profileUrl: string;
      login: jasmine.Spy;
    } = {
      isAuthenticated$: of(true),
      isLoading$: of(false),
      canExecuteWorkflows$: of(true),
      profileUrl: "https://example.com/profile",
      login: jasmine.createSpy("login"),
    };

    workflowSubmission = {
      isSubmitting: signal(false),
      showSuccessDialog: signal(false),
      successDialogData: signal<unknown>(null),
      submitWorkflowWithDataset: jasmine.createSpy("submitWorkflowWithDataset"),
      goToJobs: jasmine.createSpy("goToJobs"),
    };

    credits = jasmine.createSpyObj<CreditsService>("CreditsService", [
      "getWorkflowCredits",
      "getMyCredit",
    ]);
    credits.getWorkflowCredits.and.returnValue(of({ workflows: [] }));
    credits.getMyCredit.and.returnValue(of({ userId: "u1", credit: 100 }));

    datasetUpload = jasmine.createSpyObj<DatasetUploadService>(
      "DatasetUploadService",
      ["uploadDataset"]
    );
    pdbUpload = jasmine.createSpyObj<PdbUploadService>("PdbUploadService", [
      "validatePdbFile",
      "uploadPdbFile",
    ]);

    await TestBed.configureTestingModule({
      imports: [DeNovoDesignComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: CreditsService, useValue: credits },
        { provide: SchemaLoaderService, useValue: schemaLoader },
        { provide: DatasetUploadService, useValue: datasetUpload },
        { provide: PdbUploadService, useValue: pdbUpload },
        { provide: WorkflowSubmissionService, useValue: workflowSubmission },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("tool selection", () => {
    it("keeps BindCraft selected and reports the initial label", () => {
      expect(component.selectedTool()).toBe("bindcraft");
      expect(component.isToolSelected("bindcraft")).toBe(true);
      expect(component.selectedToolLabel()).toBe("BindCraft");
      expect(component.selectedToolData()?.id).toBe("bindcraft");
      expect(component.selectedToolHasParams()).toBe(false);
    });

    it("allows selecting rfdiffusion", () => {
      component.selectTool("rfdiffusion");
      expect(component.selectedTool()).toBe("rfdiffusion");
    });

    it("allows selecting bindcraft", () => {
      component.selectTool("bindcraft");
      expect(component.selectedTool()).toBe("bindcraft");
    });
  });

  describe("job name errors", () => {
    it("reports no error when untouched", () => {
      expect(component.hasJobNameError()).toBe(false);
    });

    it("reports an error message once touched and invalid", () => {
      component.form.controls.jobName.setValue("1bad");
      component.form.controls.jobName.markAsTouched();
      expect(component.hasJobNameError()).toBe(true);
      expect(component.getJobNameError().length).toBeGreaterThan(0);
    });
  });

  describe("isFormValid (derived)", () => {
    beforeEach(() => {
      schemaLoader.requiredInputFields.set([requiredField("starting_pdb")]);
      schemaLoader.inputRows.set([rowWith({ starting_pdb: "target.pdb" })]);
      component.form.controls.jobName.setValue("valid-job");
      component.formErrors.set({});
    });

    it("is true when job name is valid, the row is complete, and there are no errors", () => {
      expect(component.isFormValid()).toBe(true);
    });

    it("is false when the job name is invalid", () => {
      component.form.controls.jobName.setValue("1bad");
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when a required row field is empty", () => {
      schemaLoader.inputRows.set([rowWith({ starting_pdb: "" })]);
      expect(component.isFormValid()).toBe(false);
    });

    it("ignores binder_name, id, and chains required fields", () => {
      schemaLoader.requiredInputFields.set([
        requiredField("binder_name"),
        requiredField("id"),
        requiredField("chains"),
      ]);
      schemaLoader.inputRows.set([rowWith({})]);
      expect(component.isFormValid()).toBe(true);
    });

    it("is false when a field-level error is present", () => {
      component.formErrors.set({ row1_chains: "Invalid chain" });
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when there are no input rows", () => {
      schemaLoader.inputRows.set([]);
      expect(component.isFormValid()).toBe(false);
    });
  });

  describe("config panel resizing", () => {
    it("resizes with the divider drag", () => {
      const start = new MouseEvent("mousedown", { clientX: 400 });
      component.onDividerMouseDown(start);
      expect(component.isDragging()).toBe(true);

      // Dragging left grows the panel (delta = startX - clientX).
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 350 }));
      expect(component.panelWidth()).toBe(component.defaultPanelWidth + 50);

      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(component.isDragging()).toBe(false);
    });

    it("ignores drag start when the panel is collapsed", () => {
      component.panelWidth.set(0);
      component.onDividerMouseDown(
        new MouseEvent("mousedown", { clientX: 10 })
      );
      expect(component.isDragging()).toBe(false);
    });

    it("resizes with the keyboard and clamps to bounds", () => {
      component.panelWidth.set(300);
      component.onDividerKeydown(new KeyboardEvent("keydown", { key: "Home" }));
      expect(component.panelWidth()).toBe(component.maxPanelWidth);

      component.onDividerKeydown(new KeyboardEvent("keydown", { key: "End" }));
      expect(component.panelWidth()).toBe(component.minPanelWidth);

      const before = component.panelWidth();
      component.onDividerKeydown(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(component.panelWidth()).toBe(before);
    });

    it("ignores keyboard resize when collapsed", () => {
      component.panelWidth.set(0);
      component.onDividerKeydown(
        new KeyboardEvent("keydown", { key: "ArrowLeft" })
      );
      expect(component.panelWidth()).toBe(0);
    });
  });

  describe("PDB file handling", () => {
    beforeEach(() => {
      schemaLoader.inputSchemaFields.set([field({ name: "starting_pdb" })]);
      schemaLoader.inputRows.set([rowWith({})]);
    });

    it("rejects an invalid PDB file", () => {
      pdbUpload.validatePdbFile.and.returnValue({
        valid: false,
        error: "bad file",
      });
      component.onPdbFilePicked(new File([""], "x.pdb"), "row1");
      expect(component.showAlert()).toBe(true);
      expect(component.localPdbFile()).toBeNull();
    });

    it("accepts a valid PDB file", () => {
      pdbUpload.validatePdbFile.and.returnValue({ valid: true });
      const file = new File(["data"], "target.pdb");
      component.onPdbFilePicked(file, "row1");
      expect(component.localPdbFile()).toBe(file);
      expect(component.getRowValue("row1", "starting_pdb")).toBe("target.pdb");
    });

    it("clears structure-derived fields when replacing an existing file", () => {
      pdbUpload.validatePdbFile.and.returnValue({ valid: true });
      component.localPdbFile.set(new File(["old"], "old.pdb"));
      component.programmaticViewerSelection.set("A10");
      component.onPdbFilePicked(new File(["new"], "new.pdb"), "row1");
      expect(component.programmaticViewerSelection()).toBe("");
    });

    it("clears the local PDB state", () => {
      component.localPdbFile.set(new File(["x"], "x.pdb"));
      component.pdbResidueMap.set(new Map([["A", new Set([1])]]));
      component.clearLocalPdb("row1");
      expect(component.localPdbFile()).toBeNull();
      expect(component.pdbResidueMap()).toBeNull();
    });

    it("stores the detected residue map, or null when empty", () => {
      const map = new Map([["A", new Set([1, 2])]]);
      component.onStructureResiduesDetected(map);
      expect(component.pdbResidueMap()).toBe(map);
      component.onStructureResiduesDetected(new Map());
      expect(component.pdbResidueMap()).toBeNull();
    });
  });

  describe("row field validation", () => {
    beforeEach(() => {
      schemaLoader.inputSchemaFields.set([
        field({ name: "some_field" }),
        field({ name: "target_hotspot_residues" }),
      ]);
      schemaLoader.inputRows.set([rowWith({})]);
    });

    it("passes a valid hotspot residue", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "A56"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toBeNull();
    });

    it("rejects a malformed hotspot token", () => {
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "zzz"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toContain("Invalid format");
    });

    it("rejects a hotspot chain missing from the PDB", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "B12"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toContain("not found in PDB");
    });

    it("rejects a hotspot residue missing from its chain", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "A99"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toContain("Residue 99");
    });

    it("rejects a hotspot range end missing from its chain", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([12])]]));
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "A12-A14"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toContain("End residue 14");
    });

    it("accepts exactly 8 hotspot residues", () => {
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "A1,A2,A3,A4,A5,A6,A7,A8"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toBeNull();
    });

    it("rejects more than 8 individual hotspot residues", () => {
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "A1,A2,A3,A4,A5,A6,A7,A8,A9"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toContain("Too many hotspot residues");
    });

    it("rejects a range that expands past 8 residues", () => {
      component.updateRowValueWithValidation(
        "row1",
        "target_hotspot_residues",
        "A1-A9"
      );
      expect(
        component.getRowFieldError("row1", "target_hotspot_residues")
      ).toContain("Too many hotspot residues");
    });

    it("sets an error when the schema validator rejects the value", () => {
      schemaLoader.inputSchemaService.validateFieldValue.and.returnValue({
        valid: false,
        errors: ["required"],
      });
      component.updateRowValueWithValidation("row1", "some_field", "A");
      expect(component.getRowFieldError("row1", "some_field")).toBe(
        "required"
      );
    });

    it("reports config-section errors including the job name", () => {
      component.form.controls.jobName.setValue("1bad");
      component.form.controls.jobName.markAsTouched();
      expect(component.hasConfigSectionErrors("row1")).toBe(true);
    });
  });

  describe("field-driven handlers", () => {
    beforeEach(() => {
      schemaLoader.inputSchemaFields.set([
        field({ name: "target_hotspot_residues" }),
        field({ name: "min_length", type: "number" }),
        field({ name: "max_length", type: "number" }),
      ]);
      schemaLoader.inputRows.set([rowWith({})]);
    });

    it("pushes viewer selection on manual hotspot change", () => {
      component.pdbResidueMap.set(
        new Map([
          ["A", new Set([56])],
          ["B", new Set([12])],
        ])
      );
      component.onHotspotResiduesManualChange("row1", "A56,B12");
      expect(component.getRowValue("row1", "target_hotspot_residues")).toBe(
        "A56,B12"
      );
      expect(component.programmaticViewerSelection()).toBe("A56,B12");
    });

    it("updates hotspot residues when selected in the viewer", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.onResiduesSelected("row1", "A56");
      expect(component.getRowValue("row1", "target_hotspot_residues")).toBe(
        "A56"
      );
    });

    it("flags a structure that is too small", () => {
      component.onSequenceLengthDetected(10);
      expect(component.getRowFieldError("row1", "starting_pdb")).toContain(
        "Minimum 50"
      );
    });

    it("flags a structure that is too large", () => {
      component.onSequenceLengthDetected(400);
      expect(component.getRowFieldError("row1", "starting_pdb")).toContain(
        "Maximum 300"
      );
    });

    it("clears the length error for an in-range structure", () => {
      component.onSequenceLengthDetected(10);
      component.onSequenceLengthDetected(150);
      expect(component.getRowFieldError("row1", "starting_pdb")).toBeNull();
    });

    it("updates min and max on length range change", () => {
      component.onLengthRangeChange("row1", { min: 60, max: 120 });
      expect(component.getRowValue("row1", "min_length")).toBe(60);
      expect(component.getRowValue("row1", "max_length")).toBe(120);
    });

    it("captures the selected input file name", () => {
      const file = new File(["x"], "seq.fasta");
      component.onFileSelected({
        target: { files: [file] },
      } as unknown as Event);
      expect(component.inputFileName()).toBe("seq.fasta");
    });
  });

  describe("form data handlers", () => {
    beforeEach(() => {
      schemaLoader.inputSchemaFields.set([
        field({ name: "text_field", type: "string" }),
        field({ name: "num_field", type: "number" }),
        field({ name: "bool_field", type: "boolean" }),
      ]);
    });

    it("updates and validates a field value", () => {
      component.updateFieldValue("text_field", "hello");
      expect(component.formData()["text_field"]).toBe("hello");
    });

    it("handles text, number, select and boolean inputs", () => {
      component.onInputChange("text_field", {
        target: { value: "abc" },
      } as unknown as Event);
      component.onNumberChange("num_field", {
        target: { value: "42" },
      } as unknown as Event);
      component.onSelectChange("text_field", {
        target: { value: "opt" },
      } as unknown as Event);
      component.onBooleanChange("bool_field", {
        target: { value: "true" },
      } as unknown as Event);

      expect(component.formData()["num_field"]).toBe(42);
      expect(component.formData()["text_field"]).toBe("opt");
      expect(component.formData()["bool_field"]).toBe(true);
    });

    it("stores a chosen file on file change", () => {
      const file = new File(["x"], "f.pdb");
      component.onFileChange("text_field", {
        target: { files: [file] },
      } as unknown as Event);
      expect(component.formData()["text_field"]).toBe(file);
    });

    it("records a validation error for an invalid field", () => {
      schemaLoader.inputSchemaService.validateFieldValue.and.returnValue({
        valid: false,
        errors: ["bad value"],
      });
      component.updateFieldValue("text_field", "x");
      expect(component.formErrors()["text_field"]).toBe("bad value");
    });

    it("ignores unknown fields on validation", () => {
      component.validateSingleField("does_not_exist");
      expect(component.formErrors()["does_not_exist"]).toBeUndefined();
    });
  });

  describe("getFormData", () => {
    it("merges optional field defaults with current form data", () => {
      schemaLoader.optionalInputFields.set([
        field({ name: "already", type: "string" }),
        field({ name: "str", type: "string" }),
        field({ name: "num", type: "number", validation: { min: 7 } }),
        field({ name: "flag", type: "boolean" }),
        field({ name: "arr", type: "array" }),
        field({ name: "obj", type: "object" }),
        field({ name: "preset", type: "string", default: "def" }),
      ]);
      component.formData.set({ already: "kept" });

      const data = component.getFormData();
      expect(data["already"]).toBe("kept");
      expect(data["str"]).toBe("");
      expect(data["num"]).toBe(7);
      expect(data["flag"]).toBe(false);
      expect(data["arr"]).toEqual([]);
      expect(data["obj"]).toEqual({});
      expect(data["preset"]).toBe("def");
    });
  });

  describe("formSummary and configuration", () => {
    beforeEach(() => {
      schemaLoader.inputSchemaFields.set([
        field({ name: "starting_pdb", type: "string", label: "Target PDB" }),
        field({ name: "flag", type: "boolean", label: "Flag" }),
        field({ name: "count", type: "number", label: "Count" }),
        field({ name: "settings_filters", type: "string" }),
      ]);
      schemaLoader.requiredInputFields.set([requiredField("starting_pdb")]);
      component.form.controls.jobName.setValue("job-1");
    });

    it("builds a summary excluding hidden fields and formatting values", () => {
      component.formData.set({
        starting_pdb: "https://host/path/model.pdb",
        flag: true,
        count: 5,
        settings_filters: "hidden",
      });

      const summary = component.formSummary();
      const byField = new Map(summary.map((s) => [s.fieldName, s]));

      expect(byField.get("id")?.value).toBe("job-1");
      expect(byField.get("settings_filters")).toBeUndefined();
      expect(byField.get("flag")?.value).toBe("Yes");
      expect(byField.get("count")?.value).toBe("5");
      expect(byField.get("starting_pdb")?.value).toBe("model.pdb");
      expect(byField.get("starting_pdb")?.url).toBe(
        "https://host/path/model.pdb"
      );
    });

    it("prefers the local file name for the starting PDB", () => {
      component.formData.set({ starting_pdb: "" });
      component.localPdbFile.set(new File(["x"], "local.pdb"));
      const summary = component.formSummary();
      const pdb = summary.find((s) => s.fieldName === "starting_pdb");
      expect(pdb?.value).toBe("local.pdb");
    });

    it("summarizes the configuration", () => {
      const cfg = component.getConfigurationSummary();
      expect(cfg.tool).toBe("BindCraft");
      expect(cfg.totalFields).toBe(4);
      expect(cfg.requiredFields).toBe(1);
    });
  });

  describe("row number values and credit cost", () => {
    beforeEach(() => {
      schemaLoader.inputRows.set([rowWith({})]);
    });

    it("reads numeric, numeric-string and fallback values", () => {
      component.updateRowValue("row1", "n", 5);
      expect(component.getRowNumberValue("row1", "n", 0)).toBe(5);
      component.updateRowValue("row1", "n", "7");
      expect(component.getRowNumberValue("row1", "n", 0)).toBe(7);
      component.updateRowValue("row1", "n", "abc");
      expect(component.getRowNumberValue("row1", "n", 3)).toBe(3);
    });

    it("computes credit cost from multiplier and design count", () => {
      component["toolMultipliers"].set({ bindcraft: 10 });
      component.updateRowValue("row1", "number_of_final_designs", 2);
      expect(component.creditCost()).toBe(20);
    });

    it("returns null credit cost when no multiplier is set", () => {
      component["toolMultipliers"].set({});
      expect(component.creditCost()).toBeNull();
    });

    it("returns null credit cost when there are no rows", () => {
      schemaLoader.inputRows.set([]);
      component["toolMultipliers"].set({ bindcraft: 10 });
      expect(component.creditCost()).toBeNull();
    });
  });

  describe("section validity and validation summary", () => {
    it("marks input-config and review by form validity, others always valid", () => {
      schemaLoader.requiredInputFields.set([]);
      schemaLoader.inputRows.set([rowWith({})]);
      component.form.controls.jobName.setValue("job-1");
      expect(component.isSectionValid("input-config")).toBe(true);
      expect(component.isSectionValid("select-tool")).toBe(true);
      expect(component.isSectionValid("tool-settings")).toBe(true);
    });

    it("summarizes form validation state", () => {
      schemaLoader.inputRows.set([rowWith({})]);
      component.formErrors.set({ row1_chains: "err" });
      const summary = component.getFormValidationSummary();
      expect(summary.errorCount).toBe(1);
      expect(summary.rowCount).toBe(1);
    });
  });

  describe("loadInputSchema", () => {
    it("seeds form data and slider bounds on success", () => {
      schemaLoader.inputRows.set([rowWith({})]);
      schemaLoader.generateDefaultValues.and.returnValue({
        max_length: 250,
        min_length: 40,
      });
      schemaLoader.loadInputSchema.and.callFake(
        (_url: string, onSuccess: () => void) => onSuccess()
      );
      schemaLoader.initializeDefaultRow.and.callFake((cb: () => void) => cb());

      component.loadInputSchema();

      expect(component.pdbSequenceLength()).toBe(250);
      expect(component.pdbSequenceMin()).toBe(40);
      expect(schemaLoader.updateRowValue).toHaveBeenCalledWith(
        "row1",
        "number_of_final_designs",
        1
      );
    });

    it("logs on failure", () => {
      const errorSpy = spyOn(console, "error");
      schemaLoader.loadInputSchema.and.callFake(
        (_url: string, _onSuccess: () => void, onError: (e: unknown) => void) =>
          onError(new Error("boom"))
      );
      component.loadInputSchema();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("submission", () => {
    beforeEach(() => {
      schemaLoader.inputSchemaFields.set([field({ name: "starting_pdb" })]);
      schemaLoader.inputRows.set([rowWith({})]);
      component.form.controls.jobName.setValue("job-1");
    });

    it("uploads the PDB then the dataset then launches the workflow", () => {
      component.localPdbFile.set(new File(["data"], "target.pdb"));
      pdbUpload.uploadPdbFile.and.returnValue(
        of({ message: "", success: true, s3Uri: "s3://bucket/target.pdb" })
      );
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );

      component["performSubmit"]();

      expect(pdbUpload.uploadPdbFile).toHaveBeenCalled();
      expect(datasetUpload.uploadDataset).toHaveBeenCalled();
      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
    });

    it("derives deduplicated chains from hotspot residues for bindcraft", () => {
      component.formData.set({ target_hotspot_residues: "A12,A13" });
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );

      component["performSubmit"]();

      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
      const payload = workflowSubmission.submitWorkflowWithDataset.calls.mostRecent()
        .args[0] as Record<string, unknown>;
      expect(payload["chains"]).toBe("A");
    });

    it("omits chains from the payload for rfdiffusion", () => {
      component.selectTool("rfdiffusion");
      component.formData.set({
        target_hotspot_residues: "A12,B5",
        starting_pdb: "s3://bucket/target.pdb",
      });

      component["performSubmit"]();

      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
      const payload = workflowSubmission.submitWorkflowWithDataset.calls.mostRecent()
        .args[0] as Record<string, unknown>;
      expect("chains" in payload).toBe(false);
    });

    it("falls back to the file name when the upload returns no URI", () => {
      component.localPdbFile.set(new File(["data"], "target.pdb"));
      pdbUpload.uploadPdbFile.and.returnValue(
        of({ message: "", success: true })
      );
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );

      component["performSubmit"]();

      expect(datasetUpload.uploadDataset).toHaveBeenCalled();
    });

    it("surfaces a workflow launch failure after dataset upload", () => {
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );
      workflowSubmission.submitWorkflowWithDataset.and.callFake(
        (
          _payload: unknown,
          _key: string,
          onError: (e: { message?: string }) => void
        ) => onError({})
      );

      component["performSubmit"]();

      expect(component.showAlert()).toBe(true);
    });

    it("validates all required fields, skipping binder_name and id", () => {
      schemaLoader.inputSchemaFields.set([field({ name: "starting_pdb" })]);
      schemaLoader.requiredInputFields.set([
        requiredField("binder_name"),
        requiredField("id"),
        requiredField("starting_pdb"),
      ]);
      component["validateAll"]();
      expect(
        schemaLoader.inputSchemaService.validateFieldValue
      ).toHaveBeenCalled();
    });

    it("surfaces an error if the PDB upload fails", () => {
      component.localPdbFile.set(new File(["data"], "target.pdb"));
      pdbUpload.uploadPdbFile.and.returnValue(
        throwError(() => new Error("upload failed"))
      );

      component["performSubmit"]();

      expect(component.showAlert()).toBe(true);
      expect(workflowSubmission.isSubmitting()).toBe(false);
    });

    it("submits directly when no local PDB is staged", () => {
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );
      component["performSubmit"]();
      expect(pdbUpload.uploadPdbFile).not.toHaveBeenCalled();
      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
    });

    it("shows an error when the dataset upload returns no key", () => {
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true })
      );
      component["performSubmit"]();
      expect(component.showAlert()).toBe(true);
      expect(
        workflowSubmission.submitWorkflowWithDataset
      ).not.toHaveBeenCalled();
    });

    it("shows an error when the dataset upload fails", () => {
      datasetUpload.uploadDataset.and.returnValue(
        throwError(() => new Error("dataset failed"))
      );
      component["performSubmit"]();
      expect(component.showAlert()).toBe(true);
    });

    it("validateAll marks the form touched and validates rows", () => {
      component["validateAll"]();
      expect(component.form.controls.jobName.touched).toBe(true);
    });

    it("resets the form to schema defaults", () => {
      schemaLoader.generateDefaultValues.and.returnValue({ foo: "bar" });
      component.resetForm();
      expect(component.formData()["number_of_final_designs"]).toBe(1);
    });
  });

  describe("lifecycle", () => {
    it("loads the schema on init and tears down on destroy", () => {
      component.ngOnInit();
      expect(schemaLoader.loadInputSchema).toHaveBeenCalled();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
