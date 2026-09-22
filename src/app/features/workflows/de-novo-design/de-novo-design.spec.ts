import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Observable, of, throwError } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import { CreditsService } from "../../../core/services/credits.service";
import { DatasetUploadService } from "../services/dataset-upload.service";
import { PdbUploadService } from "../services/pdb-upload.service";
import { WorkflowSubmissionService } from "../services/workflow-submission.service";
import DeNovoDesignComponent from "./de-novo-design";

describe("DeNovoDesignComponent", () => {
  let component: DeNovoDesignComponent;
  let fixture: ComponentFixture<DeNovoDesignComponent>;
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
    pdbUpload.validatePdbFile.and.returnValue({ valid: true });

    await TestBed.configureTestingModule({
      imports: [DeNovoDesignComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: CreditsService, useValue: credits },
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

  it("defaults the binder length range to 65-150", () => {
    expect(component.minLength()).toBe(65);
    expect(component.maxLength()).toBe(150);
  });

  it("defaults the number of designs to 1", () => {
    expect(component.numberOfDesigns()).toBe(1);
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

    it("swaps the number-of-designs label per tool", () => {
      component.selectTool("bindcraft");
      expect(component.trajectoryFieldLabel()).toBe("Number of Trajectories");
      component.selectTool("rfdiffusion");
      expect(component.trajectoryFieldLabel()).toBe("Number of Final Designs");
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
      component.form.controls.jobName.setValue("valid-job");
      component.startingPdb.set("target.pdb");
      component.targetHotspotResidues.set("A56");
      component.numberOfDesigns.set(1);
      component.formErrors.set({});
    });

    it("is true when all required fields are filled and there are no errors", () => {
      expect(component.isFormValid()).toBe(true);
    });

    it("is false when the job name is invalid", () => {
      component.form.controls.jobName.setValue("1bad");
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when no PDB has been uploaded", () => {
      component.startingPdb.set("");
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when hotspot residues are empty", () => {
      component.targetHotspotResidues.set("");
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when the number of designs is invalid", () => {
      component.numberOfDesigns.set(0);
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when a field-level error is present", () => {
      component.formErrors.set({ target_hotspot_residues: "Invalid" });
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
    it("rejects an invalid PDB file", () => {
      pdbUpload.validatePdbFile.and.returnValue({
        valid: false,
        error: "bad file",
      });
      component.onPdbFilePicked(new File([""], "x.pdb"));
      expect(component.showAlert()).toBe(true);
      expect(component.localPdbFile()).toBeNull();
    });

    it("accepts a valid PDB file", () => {
      pdbUpload.validatePdbFile.and.returnValue({ valid: true });
      const file = new File(["data"], "target.pdb");
      component.onPdbFilePicked(file);
      expect(component.localPdbFile()).toBe(file);
      expect(component.startingPdb()).toBe("target.pdb");
    });

    it("clears structure-derived fields when replacing an existing file", () => {
      pdbUpload.validatePdbFile.and.returnValue({ valid: true });
      component.localPdbFile.set(new File(["old"], "old.pdb"));
      component.programmaticViewerSelection.set("A10");
      component.onPdbFilePicked(new File(["new"], "new.pdb"));
      expect(component.programmaticViewerSelection()).toBe("");
      expect(component.targetHotspotResidues()).toBe("");
    });

    it("clears the local PDB state", () => {
      component.localPdbFile.set(new File(["x"], "x.pdb"));
      component.pdbResidueMap.set(new Map([["A", new Set([1])]]));
      component.clearLocalPdb();
      expect(component.localPdbFile()).toBeNull();
      expect(component.pdbResidueMap()).toBeNull();
      expect(component.startingPdb()).toBe("");
    });

    it("stores the detected residue map, or null when empty", () => {
      const map = new Map([["A", new Set([1, 2])]]);
      component.onStructureResiduesDetected(map);
      expect(component.pdbResidueMap()).toBe(map);
      component.onStructureResiduesDetected(new Map());
      expect(component.pdbResidueMap()).toBeNull();
    });
  });

  describe("hotspot residue validation", () => {
    it("passes a valid hotspot residue", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.onHotspotResiduesManualChange("A56");
      expect(component.getFieldError("target_hotspot_residues")).toBeNull();
    });

    it("rejects a malformed hotspot token", () => {
      component.onHotspotResiduesManualChange("zzz");
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "Invalid format"
      );
    });

    it("rejects a hotspot chain missing from the PDB", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.onHotspotResiduesManualChange("B12");
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "not found in PDB"
      );
    });

    it("rejects a hotspot residue missing from its chain", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.onHotspotResiduesManualChange("A99");
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "Residue 99"
      );
    });

    it("rejects a hotspot range end missing from its chain", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([12])]]));
      component.onHotspotResiduesManualChange("A12-A14");
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "End residue 14"
      );
    });

    it("accepts exactly 8 hotspot residues", () => {
      component.onHotspotResiduesManualChange("A1,A2,A3,A4,A5,A6,A7,A8");
      expect(component.getFieldError("target_hotspot_residues")).toBeNull();
    });

    it("rejects more than 8 individual hotspot residues", () => {
      component.onHotspotResiduesManualChange("A1,A2,A3,A4,A5,A6,A7,A8,A9");
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "Too many hotspot residues"
      );
    });

    it("rejects a range that expands past 8 residues", () => {
      component.onHotspotResiduesManualChange("A1-A9");
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "Too many hotspot residues"
      );
    });

    it("requires a value", () => {
      component.validateHotspotResiduesField();
      expect(component.getFieldError("target_hotspot_residues")).toContain(
        "required"
      );
    });

    it("reports config-section errors including the job name", () => {
      component.form.controls.jobName.setValue("1bad");
      component.form.controls.jobName.markAsTouched();
      expect(component.hasConfigSectionErrors()).toBe(true);
    });
  });

  describe("field-driven handlers", () => {
    it("pushes viewer selection on manual hotspot change", () => {
      component.pdbResidueMap.set(
        new Map([
          ["A", new Set([56])],
          ["B", new Set([12])],
        ])
      );
      component.onHotspotResiduesManualChange("A56,B12");
      expect(component.targetHotspotResidues()).toBe("A56,B12");
      expect(component.programmaticViewerSelection()).toBe("A56,B12");
    });

    it("updates hotspot residues when selected in the viewer", () => {
      component.pdbResidueMap.set(new Map([["A", new Set([56])]]));
      component.onResiduesSelected("A56");
      expect(component.targetHotspotResidues()).toBe("A56");
    });

    it("flags a structure that is too small", () => {
      component.onSequenceLengthDetected(10);
      expect(component.getFieldError("starting_pdb")).toContain(
        "upload a larger structure"
      );
    });

    it("flags a structure that is too large", () => {
      component.onSequenceLengthDetected(400);
      expect(component.getFieldError("starting_pdb")).toContain(
        "upload a smaller structure"
      );
    });

    it("clears the length error for an in-range structure", () => {
      component.onSequenceLengthDetected(10);
      component.onSequenceLengthDetected(150);
      expect(component.getFieldError("starting_pdb")).toBeNull();
    });

    it("updates min and max on length range change", () => {
      component.onLengthRangeChange({ min: 60, max: 120 });
      expect(component.minLength()).toBe(60);
      expect(component.maxLength()).toBe(120);
    });

    it("validates the number of designs", () => {
      component.onNumberOfDesignsChange(0);
      expect(component.getFieldError("max_trajectories")).toContain(
        "whole number"
      );
      component.onNumberOfDesignsChange(5);
      expect(component.numberOfDesigns()).toBe(5);
      expect(component.getFieldError("max_trajectories")).toBeNull();
    });
  });

  describe("formSummary", () => {
    beforeEach(() => {
      component.form.controls.jobName.setValue("job-1");
      component.targetHotspotResidues.set("A56");
      component.minLength.set(65);
      component.maxLength.set(150);
      component.numberOfDesigns.set(3);
    });

    it("summarizes the job name, hotspot residues, length range, and design count", () => {
      const summary = component.formSummary();
      const byField = new Map(summary.map((s) => [s.fieldName, s]));

      expect(byField.get("id")?.value).toBe("job-1");
      expect(byField.get("target_hotspot_residues")?.value).toBe("A56");
      expect(byField.get("length_range")?.value).toBe("65 - 150");
      expect(byField.get("max_trajectories")?.value).toBe("3");
    });

    it("shows the s3 URI as a download link once the PDB is uploaded", () => {
      component.startingPdb.set("https://host/path/model.pdb");
      const summary = component.formSummary();
      const pdb = summary.find((s) => s.fieldName === "starting_pdb");
      expect(pdb?.value).toBe("model.pdb");
      expect(pdb?.url).toBe("https://host/path/model.pdb");
    });

    it("prefers the local file name for the starting PDB", () => {
      component.localPdbFile.set(new File(["x"], "local.pdb"));
      const summary = component.formSummary();
      const pdb = summary.find((s) => s.fieldName === "starting_pdb");
      expect(pdb?.value).toBe("local.pdb");
    });
  });

  describe("credit cost", () => {
    it("computes credit cost from multiplier and design count", () => {
      component["toolMultipliers"].set({ bindcraft: 10 });
      component.numberOfDesigns.set(2);
      expect(component.creditCost()).toBe(20);
    });

    it("returns null credit cost when no multiplier is set", () => {
      component["toolMultipliers"].set({});
      expect(component.creditCost()).toBeNull();
    });

    it("returns null credit cost when the design count is invalid", () => {
      component["toolMultipliers"].set({ bindcraft: 10 });
      component.numberOfDesigns.set(0);
      expect(component.creditCost()).toBeNull();
    });
  });

  describe("section validity", () => {
    it("marks input-config and review by form validity, others always valid", () => {
      component.form.controls.jobName.setValue("job-1");
      expect(component.isSectionValid("select-tool")).toBe(true);
      expect(component.isSectionValid("tool-settings")).toBe(true);
    });
  });

  describe("submission", () => {
    beforeEach(() => {
      component.form.controls.jobName.setValue("job-1");
      component.targetHotspotResidues.set("A12,A13");
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
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );

      component["performSubmit"]();

      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
      const payload =
        workflowSubmission.submitWorkflowWithDataset.calls.mostRecent()
          .args[0] as Record<string, unknown>;
      expect(payload["chains"]).toBe("A");
    });

    it("omits chains from the payload for rfdiffusion", () => {
      component.selectTool("rfdiffusion");
      component.startingPdb.set("s3://bucket/target.pdb");
      component.targetHotspotResidues.set("A12,B5");

      component["performSubmit"]();

      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
      const payload =
        workflowSubmission.submitWorkflowWithDataset.calls.mostRecent()
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
      component.startingPdb.set("s3://bucket/target.pdb");
      datasetUpload.uploadDataset.and.returnValue(
        of({ message: "", success: true, s3Key: "key-123" })
      );
      component["performSubmit"]();
      expect(pdbUpload.uploadPdbFile).not.toHaveBeenCalled();
      expect(workflowSubmission.submitWorkflowWithDataset).toHaveBeenCalled();
    });

    it("shows an error when the dataset upload returns no key", () => {
      component.startingPdb.set("s3://bucket/target.pdb");
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
      component.startingPdb.set("s3://bucket/target.pdb");
      datasetUpload.uploadDataset.and.returnValue(
        throwError(() => new Error("dataset failed"))
      );
      component["performSubmit"]();
      expect(component.showAlert()).toBe(true);
    });

    it("blocks an rfdiffusion submission with no PDB uploaded", () => {
      component.selectTool("rfdiffusion");
      component["performSubmit"]();
      expect(component.showAlert()).toBe(true);
      expect(
        workflowSubmission.submitWorkflowWithDataset
      ).not.toHaveBeenCalled();
    });

    it("validateAll marks the form touched", () => {
      component["validateAll"]();
      expect(component.form.controls.jobName.touched).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it("tears down on destroy without throwing", () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
