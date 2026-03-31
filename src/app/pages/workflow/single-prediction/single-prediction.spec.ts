import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, throwError } from "rxjs";
import { AuthService } from "../../../cores/auth.service";
import { CcdLookupService } from "../../../cores/services/ccd-lookup.service";
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import {
  isValidSmiles,
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence
} from "../../../cores/utils/fasta.utils";
import { SinglePredictionComponent } from "./single-prediction";

describe("SinglePredictionComponent", () => {
  let component: SinglePredictionComponent;
  let fixture: ComponentFixture<SinglePredictionComponent>;
  let datasetUploadService: jasmine.SpyObj<DatasetUploadService>;
  let ccdLookupService: jasmine.SpyObj<CcdLookupService>;
  let workflowSubmissionService: {
    isSubmitting: ReturnType<typeof signal<boolean>>;
    showSuccessDialog: ReturnType<typeof signal<boolean>>;
    successDialogData: ReturnType<typeof signal<{ runId: string; status: string } | null>>;
    submitWorkflowWithDataset: jasmine.Spy;
    goToJobs: jasmine.Spy;
  };
  let authService: {
    isAuthenticated$: Observable<boolean>;
    login: jasmine.Spy;
  };

  beforeEach(async () => {
    datasetUploadService = jasmine.createSpyObj("DatasetUploadService", [
      "uploadDataset",
    ]);
    datasetUploadService.uploadDataset.and.returnValue(
      of({
        success: true,
        message: "ok",
        datasetId: "dataset-1",
      })
    );

    ccdLookupService = jasmine.createSpyObj("CcdLookupService", ["lookup"]);
    ccdLookupService.lookup.and.returnValue(
      of({ valid: true, name: "ADENOSINE-5'-TRIPHOSPHATE" })
    );

    workflowSubmissionService = {
      isSubmitting: signal(false),
      showSuccessDialog: signal(false),
      successDialogData: signal(null),
      submitWorkflowWithDataset: jasmine.createSpy("submitWorkflowWithDataset"),
      goToJobs: jasmine.createSpy("goToJobs"),
    };

    authService = {
      isAuthenticated$: of(true),
      login: jasmine.createSpy("login"),
    };

    await TestBed.configureTestingModule({
      imports: [SinglePredictionComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: CcdLookupService, useValue: ccdLookupService },
        { provide: DatasetUploadService, useValue: datasetUploadService },
        {
          provide: WorkflowSubmissionService,
          useValue: workflowSubmissionService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidProteinRow(
    sequence = "ACDEFGHIK",
    copyNumber = "1"
  ): number {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, sequence);
    component.updateRowCopyNumber(rowId, copyNumber);
    component.updateRowMoleculeType(rowId, "protein");
    return rowId;
  }

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should start with one default entity row", () => {
    expect(component.entityRows().length).toBe(1);
    expect(component.entityRows()[0].copyNumber).toBe("1");
    expect(component.entityRows()[0].moleculeType).toBe("protein");
    expect(component.selectedTool()).toBe("colabfold");
  });

  it("should switch tabs", () => {
    component.switchTab("papers");
    expect(component.activeTab()).toBe("papers");
    expect(component.isActiveTab("papers")).toBe(true);
  });

  it("should add and remove rows while keeping one minimum row", () => {
    component.addEntityRow();
    const secondRowId = component.entityRows()[1].id;

    expect(component.entityRows().length).toBe(2);

    component.removeEntityRow(secondRowId);
    expect(component.entityRows().length).toBe(1);

    component.removeEntityRow(component.entityRows()[0].id);
    expect(component.entityRows().length).toBe(1);
  });

  it("should reorder rows from a drag-drop event", () => {
    const firstRowId = component.entityRows()[0].id;
    component.updateRowSequence(firstRowId, "FIRST");

    component.addEntityRow();
    const secondRowId = component.entityRows()[1].id;
    component.updateRowSequence(secondRowId, "SECOND");

    component.dropEntityRow({
      previousIndex: 0,
      currentIndex: 1,
    } as never);
    expect(component.entityRows().map((row) => row.sequence)).toEqual([
      "SECOND",
      "FIRST",
    ]);

    component.dropEntityRow({
      previousIndex: 1,
      currentIndex: 1,
    } as never);
    expect(component.entityRows().map((row) => row.sequence)).toEqual([
      "SECOND",
      "FIRST",
    ]);
  });

  it("should update row fields and touched state", () => {
    const rowId = component.entityRows()[0].id;

    component.updateRowSequence(rowId, "AUGC");
    component.updateRowCopyNumber(rowId, "2");
    component.updateRowMoleculeType(rowId, "rna");
    component.touchRowField(rowId, "sequence");

    expect(component.entityRows()[0].sequence).toBe("AUGC");
    expect(component.entityRows()[0].copyNumber).toBe("2");
    expect(component.entityRows()[0].moleculeType).toBe("rna");
    expect(component.entityRows()[0].touched.sequence).toBe(true);
  });

  it("should enforce protein-only validation for ColabFold", () => {
    const rowId = component.entityRows()[0].id;

    component.updateRowSequence(rowId, "AUGC");
    component.updateRowMoleculeType(rowId, "rna");

    expect(component.isStep1Valid()).toBe(false);
    expect(component.getRowErrors(0).tool).toContain("protein-only");
  });

  it("should validate DNA, RNA, and ligand formats", () => {
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");

    component.updateRowSequence(rowId, "ACGTNN");
    component.updateRowMoleculeType(rowId, "dna");
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowSequence(rowId, "AXGT");
    expect(component.getRowErrors(0).sequence).toContain("DNA sequence");

    component.updateRowSequence(rowId, "AUGCUU");
    component.updateRowMoleculeType(rowId, "rna");
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowSequence(rowId, "CC(=O)O");
    component.updateRowMoleculeType(rowId, "ligand");
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowSequence(rowId, "bad smiles");
    expect(component.getRowErrors(0).sequence).toContain("SMILES");

    component.updateRowSequence(rowId, "ATP");
    component.updateRowMoleculeType(rowId, "ccd");
    expect(component.isStep1Valid()).toBe(true);

    ccdLookupService.lookup.and.returnValue(
      of({ valid: false, errorMessage: "Ligand CCD code must be 1\u20135 alphanumeric characters (e.g. ATP, HEM)." })
    );
    component.updateRowSequence(rowId, "AT!P");
    expect(component.getRowErrors(0).sequence).toContain("CCD");
  });

  it("should call RCSB API and mark CCD row valid when lookup succeeds", () => {
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "ATP");

    expect(ccdLookupService.lookup).toHaveBeenCalledWith("ATP");
    expect(component.ccdLookupState()[rowId]).toBe("valid");
    expect(component.ccdLookupNames()[rowId]).toBe("ADENOSINE-5'-TRIPHOSPHATE");
    expect(component.isStep1Valid()).toBe(true);
  });

  it("should mark CCD row invalid and add error when RCSB lookup returns not found", () => {
    ccdLookupService.lookup.and.returnValue(
      of({ valid: false, errorMessage: "CCD code not found in the RCSB Chemical Component Dictionary." })
    );
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "XYZ");

    expect(component.ccdLookupState()[rowId]).toBe("invalid");
    expect(component.isStep1Valid()).toBe(false);
    expect(component.getRowErrors(0).sequence).toContain("not found");
  });

  it("should clear CCD lookup state when switching away from ccd molecule type", () => {
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "ATP");
    expect(component.ccdLookupState()[rowId]).toBe("valid");

    component.updateRowMoleculeType(rowId, "protein");
    expect(component.ccdLookupState()[rowId]).toBeUndefined();
  });

  it("should block step 1 advance while CCD lookup is in-flight (loading state)", () => {
    // Return an observable that never completes to simulate in-flight
    ccdLookupService.lookup.and.returnValue(new Observable());
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "ATP");

    expect(component.ccdLookupState()[rowId]).toBe("loading");
    expect(component.isStep1Valid()).toBe(false);
  });

  it("should return protein and RNA validation messages for invalid sequences", () => {
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");

    component.updateRowSequence(rowId, "123");
    component.updateRowMoleculeType(rowId, "protein");
    expect(component.getRowErrors(0).sequence).toContain("amino acid");

    component.updateRowSequence(rowId, "AXGT");
    component.updateRowMoleculeType(rowId, "rna");
    expect(component.getRowErrors(0).sequence).toContain("RNA sequence");
  });

  it("should reject malformed SMILES branches and use the fallback message path", () => {
    expect(isValidSmiles("C]")).toBe(false);
    expect(isValidSmiles("C?")).toBe(false);
    expect(isValidSmiles("12345")).toBe(false);
    expect(
      component["validateSequenceByMoleculeType"]("ABC", "other" as never)
    ).toEqual({
      valid: false,
      errorMessage: "Sequence format is invalid.",
    });
  });

  it("should build Boltz settings payload and cover fallback payload branch", () => {
    component.selectTool("boltz");
    component.boltzUsePotentials.set(true);
    expect(component["buildToolSettingsPayload"]()).toEqual({
      boltz_use_potentials: true,
    });

    component.selectedTool.set("unknown" as never);
    expect(component["buildToolSettingsPayload"]()).toEqual({});
  });

  it("should use shared sequence validators from fasta utils", () => {
    expect(validateProteinSequence("MKT AYI").valid).toBe(true);
    expect(validateProteinSequence("123").valid).toBe(false);

    expect(validateDnaSequence("ATGCN").valid).toBe(true);
    expect(validateDnaSequence("AUGC").valid).toBe(false);

    expect(validateRnaSequence("AUGCN").valid).toBe(true);
    expect(validateRnaSequence("ATGC").valid).toBe(false);
  });

  it("should allow Boltz with non-protein molecules and generate FASTA-like content", () => {
    const rowId = component.entityRows()[0].id;

    component.selectTool("boltz");
    component.updateRowSequence(rowId, "ACGT");
    component.updateRowMoleculeType(rowId, "dna");
    component.updateRowCopyNumber(rowId, "2");

    expect(component.isStep1Valid()).toBe(true);
    expect(component.generatedFastaContent()).toContain(
      ">entity_1_copy_1|dna"
    );
    expect(component.generatedFastaContent()).toContain(
      ">entity_1_copy_2|dna"
    );
  });

  it("should normalize protein sequence content in summary", () => {
    fillValidProteinRow("ac de fg");

    expect(component.formSummary()[0].value).toContain("ACDEFG");
  });

  it("should expose tool-specific settings for all tools", () => {
    expect(component.getToolSettingsSummaryItems()).toEqual([
      {
        label: "colabfold_num_recycles",
        value: "3",
        fieldName: "colabfold_num_recycles",
      },
      {
        label: "colabfold_use_templates",
        value: "true",
        fieldName: "colabfold_use_templates",
      },
    ]);

    component.selectTool("alphafold2");
    expect(component.getToolSettingsSummaryItems()).toEqual([
      {
        label: "alphafold2_random_seed",
        value: "42",
        fieldName: "alphafold2_random_seed",
      },
      {
        label: "alphafold2_full_dbs",
        value: "false",
        fieldName: "alphafold2_full_dbs",
      },
    ]);

    component.selectTool("boltz");
    expect(component.getToolSettingsSummaryItems()).toEqual([
      {
        label: "boltz_use_potentials",
        value: "false",
        fieldName: "boltz_use_potentials",
      },
    ]);
  });

  it("should validate tool settings for AlphaFold2 and ColabFold", () => {
    component.selectTool("alphafold2");
    component.updateAlphafold2RandomSeed("-1");
    expect(component.isStep2Valid()).toBe(false);
    expect(component.toolSettingErrors().alphafold2RandomSeed).toContain(
      "greater than or equal to 0"
    );

    component.updateAlphafold2RandomSeed("7");
    expect(component.isStep2Valid()).toBe(true);

    component.selectTool("colabfold");
    component.updateColabfoldNumRecycles("0");
    expect(component.isStep2Valid()).toBe(false);
    expect(component.getToolSettingsErrorCount()).toBe(1);

    component.updateColabfoldNumRecycles("4");
    expect(component.isStep2Valid()).toBe(true);
  });

  it("should track step validity and completion", () => {
    expect(component.isStepInvalid(1)).toBe(true);

    fillValidProteinRow();
    expect(component.isStepInvalid(1)).toBe(false);
    expect(component.isStepComplete(1)).toBe(false);

    component.nextStep();
    expect(component.currentStep()).toBe(2);
    expect(component.isStepComplete(1)).toBe(true);

    component.nextStep();
    expect(component.currentStep()).toBe(3);
    expect(component.isStepComplete(2)).toBe(true);
  });

  it("should block next step when step 1 is invalid and touch rows", () => {
    component.nextStep();

    expect(component.currentStep()).toBe(1);
    expect(component.stepOneTouched()).toBe(true);
    expect(component.entityRows()[0].touched.sequence).toBe(true);
  });

  it("should block next step when step 2 is invalid", () => {
    fillValidProteinRow();
    component.nextStep();
    component.selectTool("alphafold2");
    component.updateAlphafold2RandomSeed("-3");

    component.nextStep();

    expect(component.currentStep()).toBe(2);
    expect(component.stepTwoTouched()).toBe(true);
  });

  it("should navigate steps manually and move backward", () => {
    fillValidProteinRow();
    component.goToStep(2);
    expect(component.currentStep()).toBe(2);

    component.previousStep();
    expect(component.currentStep()).toBe(1);
  });

  it("should compute form validation summary", () => {
    const invalidSummary = component.getFormValidationSummary();
    expect(invalidSummary.valid).toBe(false);
    expect(invalidSummary.errorCount).toBeGreaterThan(0);

    fillValidProteinRow();
    const validSummary = component.getFormValidationSummary();
    expect(validSummary.rowCount).toBe(1);
  });

  it("should submit a valid workflow payload", () => {
    fillValidProteinRow("ACDEFGHIK", "2");
    component.selectTool("alphafold2");
    component.alphafold2FullDbs.set(true);
    component.isToolAvailable = () => true;

    component.submitWorkflow();

    expect(datasetUploadService.uploadDataset).toHaveBeenCalled();
    expect(
      workflowSubmissionService.submitWorkflowWithDataset
    ).toHaveBeenCalled();

    const payload =
      workflowSubmissionService.submitWorkflowWithDataset.calls.mostRecent()
        .args[0];
    expect(payload["mode"]).toBe("alphafold2");
    expect(payload["alphafold2_random_seed"]).toBe(42);
    expect(payload["alphafold2_full_dbs"]).toBe(true);
    expect(payload["fastaContent"]).toContain(">entity_1_copy_1|protein");
  });

  it("should show an error when submitting invalid input", () => {
    component.isToolAvailable = () => true;
    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("Please fix");
    expect(datasetUploadService.uploadDataset).not.toHaveBeenCalled();
  });

  it("should show an error when dataset upload succeeds without dataset id", () => {
    fillValidProteinRow();
    component.isToolAvailable = () => true;
    datasetUploadService.uploadDataset.and.returnValue(
      of({
        success: true,
        message: "ok",
      })
    );

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("no dataset ID");
  });

  it("should show an error when dataset upload fails", () => {
    fillValidProteinRow();
    component.isToolAvailable = () => true;
    datasetUploadService.uploadDataset.and.returnValue(
      throwError(() => new Error("upload failed"))
    );

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("upload failed");
  });

  it("should delegate login and jobs navigation helpers", () => {
    component.loginWithReturnUrl();
    component.goToJobs();

    expect(authService.login).toHaveBeenCalled();
    expect(workflowSubmissionService.goToJobs).toHaveBeenCalled();
  });

  it("should close alerts and set touched flags for tool settings", () => {
    component.showAlert.set(true);
    component.alertMessage.set("problem");
    component.setAlphafold2RandomSeedTouched();
    component.setColabfoldNumRecyclesTouched();
    component.closeAlert();

    expect(component.showAlert()).toBe(false);
    expect(component.alertMessage()).toBe("");
    expect(component.alphafold2RandomSeedTouched()).toBe(true);
    expect(component.colabfoldNumRecyclesTouched()).toBe(true);
  });
});
