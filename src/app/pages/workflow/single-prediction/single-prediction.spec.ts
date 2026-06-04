import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, throwError } from "rxjs";
import { AuthService } from "../../../cores/auth.service";
import {
  DatasetUploadResponse,
  DatasetUploadService,
} from "../../../cores/services/dataset-upload.service";
import {
  FastaUploadResponse,
  FastaUploadService,
} from "../../../cores/services/fasta-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import {
  lookupCcdCompound,
  isValidSmiles,
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence,
} from "../../../cores/utils/fasta.utils";
import { SinglePredictionComponent } from "./single-prediction";

// ── Typed mock responses conforming to service interfaces ──────────────────

const MOCK_FASTA_RESPONSE: FastaUploadResponse = {
  success: true,
  message: "FASTA file uploaded successfully",
  fileId: "input/single_prediction.fasta",
  fileName: "single_prediction.fasta",
  s3Uri: "s3://bucket/input/single_prediction.fasta",
  presignedUrl: "https://signed.example/input/single_prediction.fasta",
};

const MOCK_DATASET_RESPONSE: DatasetUploadResponse = {
  success: true,
  message: "Dataset uploaded successfully",
  datasetId: "dataset-1",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function noS3UriResponse(): FastaUploadResponse {
  return { ...MOCK_FASTA_RESPONSE, s3Uri: "", presignedUrl: "" };
}

function noDatasetIdResponse(): DatasetUploadResponse {
  return { success: true, message: "ok" };
}

// ──────────────────────────────────────────────────────────────────────────

describe("SinglePredictionComponent", () => {
  let component: SinglePredictionComponent;
  let fixture: ComponentFixture<SinglePredictionComponent>;
  let datasetUploadService: jasmine.SpyObj<DatasetUploadService>;
  let fastaUploadService: jasmine.SpyObj<FastaUploadService>;
  let workflowSubmissionService: {
    isSubmitting: ReturnType<typeof signal<boolean>>;
    showSuccessDialog: ReturnType<typeof signal<boolean>>;
    successDialogData: ReturnType<
      typeof signal<{ runId: string; status: string } | null>
    >;
    submitWorkflowWithDataset: jasmine.Spy;
    goToJobs: jasmine.Spy;
  };
  let authService: {
    isAuthenticated$: Observable<boolean>;
    canExecuteWorkflows$: Observable<boolean>;
    profileUrl: string;
    login: jasmine.Spy;
  };

  beforeEach(async () => {
    datasetUploadService = jasmine.createSpyObj<DatasetUploadService>(
      "DatasetUploadService",
      ["uploadDataset"]
    );
    datasetUploadService.uploadDataset.and.returnValue(
      of(MOCK_DATASET_RESPONSE)
    );

    fastaUploadService = jasmine.createSpyObj<FastaUploadService>(
      "FastaUploadService",
      ["uploadFastaFile"]
    );
    fastaUploadService.uploadFastaFile.and.returnValue(of(MOCK_FASTA_RESPONSE));

    workflowSubmissionService = {
      isSubmitting: signal(false),
      showSuccessDialog: signal(false),
      successDialogData: signal(null),
      submitWorkflowWithDataset: jasmine.createSpy("submitWorkflowWithDataset"),
      goToJobs: jasmine.createSpy("goToJobs"),
    };

    authService = {
      isAuthenticated$: of(true),
      canExecuteWorkflows$: of(true),
      profileUrl: "https://test.profile.example.com/profile",
      login: jasmine.createSpy("login"),
    };

    await TestBed.configureTestingModule({
      imports: [SinglePredictionComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DatasetUploadService, useValue: datasetUploadService },
        { provide: FastaUploadService, useValue: fastaUploadService },
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
    component.jobName.set("test-run");
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
    expect(component.canSubmit()).toBe(false);
  });

  it("should expose navigation and label fallbacks for unknown state", () => {
    expect(component.canGoPrev()).toBe(false);
    expect(component.canGoNext()).toBe(false);

    fillValidProteinRow();
    component.currentStep.set(2);
    expect(component.canGoNext()).toBe(true);

    component.currentStep.set(3);
    expect(component.canGoNext()).toBe(false);

    component.selectedTool.set("unknown" as never);
    expect(component.selectedToolLabel()).toBe("");
    expect(component.getToolSettingsSummaryItems()).toEqual([]);
    expect(component.getMoleculeTypeLabel("unknown" as never)).toBe("unknown");
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

    component.dropEntityRow({ previousIndex: 0, currentIndex: 1 } as never);
    expect(component.entityRows().map((row) => row.sequence)).toEqual([
      "SECOND",
      "FIRST",
    ]);

    component.dropEntityRow({ previousIndex: 1, currentIndex: 1 } as never);
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
    component.jobName.set("test-run");
    component.selectTool("boltz");

    component.updateRowSequence(rowId, "ACGT");
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

    component.updateRowSequence(rowId, "AT!P");
    expect(component.getRowErrors(0).sequence).toContain("CCD");
  });

  it("should mark CCD row valid when code is in the supported list", () => {
    const rowId = component.entityRows()[0].id;
    component.jobName.set("test-run");
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "ATP");

    expect(component.ccdLookupState()[rowId]).toBe("valid");
    expect(component.ccdLookupNames()[rowId]).toBe("Adenosine triphosphate");
    expect(component.isStep1Valid()).toBe(true);
  });

  it("should mark CCD row invalid and add error when CCD code is not in supported list", () => {
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "XYZ");

    expect(component.ccdLookupState()[rowId]).toBe("invalid");
    expect(component.isStep1Valid()).toBe(false);
    expect(component.getRowErrors(0).sequence).toContain("supported CCD list");
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

  it("should reset CCD lookup state for blank codes and expose field helper branches", () => {
    const rowId = component.entityRows()[0].id;
    component.selectTool("boltz");
    component.updateRowMoleculeType(rowId, "ccd");
    component.updateRowSequence(rowId, "ATP");

    let row = component.entityRows()[0];
    expect(component.shouldShowRowFieldError(row, "sequence")).toBe(true);
    expect(component.shouldShowRowToolError(row)).toBe(false);

    component.updateRowSequence(rowId, "   ");
    row = component.entityRows()[0];

    expect(component.ccdLookupState()[rowId]).toBe("idle");
    expect(component.ccdLookupNames()[rowId]).toBeUndefined();
    expect(component.ccdLookupErrors()[rowId]).toBeUndefined();
    expect(component.generatedFastaContent()).toBe("");
    expect(component.shouldShowRowFieldError(row, "copyNumber")).toBe(false);

    component.touchRowField(rowId, "copyNumber");
    expect(component.shouldShowRowToolError(component.entityRows()[0])).toBe(
      true
    );
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

    expect(validateDnaSequence("ATGC").valid).toBe(true);
    expect(validateDnaSequence("AUGC").valid).toBe(false);

    expect(validateRnaSequence("AUGC").valid).toBe(true);
    expect(validateRnaSequence("ATGC").valid).toBe(false);

    expect(lookupCcdCompound("ATP")).toEqual({
      valid: true,
      name: "Adenosine triphosphate",
    });
  });

  it("should allow Boltz with non-protein molecules and generate FASTA-like content", () => {
    const rowId = component.entityRows()[0].id;
    component.jobName.set("test-run");

    component.selectTool("boltz");
    component.updateRowSequence(rowId, "ACGT");
    component.updateRowMoleculeType(rowId, "dna");
    component.updateRowCopyNumber(rowId, "2");

    expect(component.isStep1Valid()).toBe(true);
    expect(component.generatedFastaContent()).toContain(">dna_1");
    expect(component.generatedFastaContent()).toContain(">dna_2");
  });

  it("should normalize protein sequence content in summary", () => {
    fillValidProteinRow("ac de fg");
    expect(component.formSummary()[0].value).toContain("ACDEFG");
  });

  it("should expose tool-specific settings for all tools", () => {
    // colabfold_use_templates is hidden from UI — must NOT appear in summary
    expect(component.getToolSettingsSummaryItems()).toEqual([
      {
        label: "colabfold_num_recycles",
        value: "3",
        fieldName: "colabfold_num_recycles",
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

    component.updateColabfoldNumRecycles("4");
    expect(component.isStep2Valid()).toBe(true);
  });

  it("should track step validity and completion", () => {
    expect(component.isStepInvalid(1)).toBe(true);

    fillValidProteinRow();
    expect(component.isStepInvalid(1)).toBe(false);
    expect(component.isStepCompleted(1)).toBe(false);

    component.nextStep();
    expect(component.currentStep()).toBe(2);
    expect(component.isStepCompleted(1)).toBe(true);

    component.nextStep();
    expect(component.currentStep()).toBe(3);
    expect(component.isStepCompleted(2)).toBe(true);
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

  it("should ignore invalid manual step changes and stay on the first step when moving back", () => {
    component.goToStep(0);
    expect(component.currentStep()).toBe(1);

    component.previousStep();
    expect(component.currentStep()).toBe(1);

    component.completedSteps.set([3]);
    expect(component.isStepInvalid(3)).toBe(false);
    expect(component.isStepCompleted(3)).toBe(true);
  });

  it("should submit a valid workflow payload", () => {
    fillValidProteinRow("ACDEFGHIK", "2");
    component.selectTool("alphafold2");
    component.alphafold2FullDbs.set(true);
    component.isToolAvailable.set(true);

    component.submitWorkflow();

    expect(fastaUploadService.uploadFastaFile).toHaveBeenCalled();
    expect(datasetUploadService.uploadDataset).toHaveBeenCalledWith(
      jasmine.objectContaining({
        formData: {
          id: "single-prediction",
          fasta: MOCK_FASTA_RESPONSE.s3Uri,
        },
      })
    );
    expect(
      workflowSubmissionService.submitWorkflowWithDataset
    ).toHaveBeenCalled();

    const payload =
      workflowSubmissionService.submitWorkflowWithDataset.calls.mostRecent()
        .args[0];
    expect(payload["runName"]).toBe("test-run");
    expect(payload["tool"]).toBe("alphafold2");
    expect(payload["alphafold2_random_seed"]).toBe(42);
    expect(payload["alphafold2_full_dbs"]).toBe(true);
    expect(payload["fastaContent"]).toContain(">pro_1");
    expect(payload["fastaFileUrl"]).toBe(MOCK_FASTA_RESPONSE.s3Uri);
    expect(payload["samplesheetId"]).toBe("single-prediction");
    expect(component.canSubmit()).toBe(true);
  });

  it("should block submission when tools are unavailable", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(false);

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("Submission is disabled");
    expect(fastaUploadService.uploadFastaFile).not.toHaveBeenCalled();
    expect(datasetUploadService.uploadDataset).not.toHaveBeenCalled();
  });

  it("should show an error when submitting invalid input", () => {
    component.isToolAvailable.set(true);
    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("Please fix");
    expect(fastaUploadService.uploadFastaFile).not.toHaveBeenCalled();
    expect(datasetUploadService.uploadDataset).not.toHaveBeenCalled();
  });

  it("should show an error when FASTA upload fails", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);
    fastaUploadService.uploadFastaFile.and.returnValue(
      throwError(() => new Error("fasta upload failed"))
    );

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("fasta upload failed");
    expect(datasetUploadService.uploadDataset).not.toHaveBeenCalled();
  });

  it("should show an error when dataset upload succeeds without dataset id", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);
    datasetUploadService.uploadDataset.and.returnValue(
      of(noDatasetIdResponse())
    );

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("no dataset ID");
  });

  it("should show an error when dataset upload fails", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);
    datasetUploadService.uploadDataset.and.returnValue(
      throwError(() => new Error("upload failed"))
    );

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("upload failed");
  });

  it("should show the workflow launch fallback error when the callback has no message", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);

    component.submitWorkflow();

    const onWorkflowError =
      workflowSubmissionService.submitWorkflowWithDataset.calls.mostRecent()
        .args[2];
    onWorkflowError({});

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("Unknown error");
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

  it("should include tool setting errors in form validation summary error count", () => {
    fillValidProteinRow();
    component.selectTool("alphafold2");
    component.updateAlphafold2RandomSeed("-5");
    component.setAlphafold2RandomSeedTouched();

    const summary = component.getFormValidationSummary();
    expect(summary.valid).toBe(false);
    expect(summary.errorCount).toBeGreaterThan(0);
  });

  it("should produce a copy number validation error for non-positive values", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");
    component.updateRowCopyNumber(rowId, "0");
    component.touchRowField(rowId, "copyNumber");

    const errors = component.entityValidationResults()[0];
    expect(errors["copyNumber"]).toContain("greater than or equal to 1");
  });

  it("should require jobName in step 1 validation", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.jobName.set("");
    expect(component.isStep1Valid()).toBe(false);

    component.jobName.set("my-job");
    expect(component.isStep1Valid()).toBe(true);
  });

  it("should reject jobName that starts with a number", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.jobName.set("1invalid");
    expect(component.isStep1Valid()).toBe(false);
    expect(component.jobNameError()).toContain("must not start with a number");
  });

  it("should reject jobName with invalid characters", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.jobName.set("job@name!");
    expect(component.isStep1Valid()).toBe(false);
    expect(component.jobNameError()).toContain("must not start with a number");
  });

  it("should reject jobName longer than 60 characters", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.jobName.set("a".repeat(61));
    expect(component.isStep1Valid()).toBe(false);
    expect(component.jobNameError()).toContain("60 characters or fewer");
  });

  it("should show job name required error after touching", () => {
    component.jobNameTouched.set(true);
    component.jobName.set("");
    expect(component.jobNameTouched()).toBe(true);

    component.nextStep();
    expect(component.jobNameTouched()).toBe(true);
  });

  it("should not advance to step 2 until jobName is filled", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");
    component.jobName.set("");

    component.nextStep();
    expect(component.currentStep()).toBe(1);

    component.jobName.set("valid-run");
    component.nextStep();
    expect(component.currentStep()).toBe(2);
  });

  it("should use the cached FASTA/dataset on second submit without re-uploading", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);

    component.submitWorkflow();
    expect(fastaUploadService.uploadFastaFile).toHaveBeenCalledTimes(1);

    component.submitWorkflow();
    expect(fastaUploadService.uploadFastaFile).toHaveBeenCalledTimes(1);
    expect(datasetUploadService.uploadDataset).toHaveBeenCalledTimes(1);
  });

  it("should show error when FASTA upload returns no s3Uri", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);
    fastaUploadService.uploadFastaFile.and.returnValue(of(noS3UriResponse()));

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("no S3 URI");
  });

  it("should include colabfold_use_templates=false in submission payload (hidden param)", () => {
    fillValidProteinRow();
    component.isToolAvailable.set(true);
    component.selectTool("colabfold");

    component.submitWorkflow();

    const payload =
      workflowSubmissionService.submitWorkflowWithDataset.calls.mostRecent()
        .args[0];
    expect(payload["colabfold_use_templates"]).toBe(false);
  });
});
