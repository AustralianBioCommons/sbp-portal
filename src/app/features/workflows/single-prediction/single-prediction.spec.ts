import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Observable, of, throwError } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import {
  DatasetUploadResponse,
  DatasetUploadService,
} from "../services/dataset-upload.service";
import {
  FastaUploadResponse,
  FastaUploadService,
} from "../services/fasta-upload.service";
import { WorkflowSubmissionService } from "../services/workflow-submission.service";
import {
  lookupCcdCompound,
  isValidSmiles,
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence,
} from "../shared/fasta.utils";
import SinglePredictionComponent from "./single-prediction";

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
  s3Key: "inputs/samplesheets/dataset-1.csv",
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
        provideHttpClient(),
        provideHttpClientTesting(),
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
    component.form.controls.jobName.setValue("test-run");
    component.updateRowSequence(rowId, sequence);
    component.updateRowCopyNumber(rowId, copyNumber);
    component.updateRowMoleculeType(rowId, "protein");
    return rowId;
  }

  function addProteinRow(sequence = "ACDEFGHIK"): number {
    component.addEntityRow();
    const rowId = component.entityRows()[component.entityRows().length - 1].id;
    component.updateRowMoleculeType(rowId, "protein");
    component.updateRowSequence(rowId, sequence);
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
    expect(component.isFormValid()).toBe(false);
  });

  it("should expose label fallbacks for unknown state", () => {
    component.selectedTool.set("unknown" as never);
    expect(component.selectedToolLabel()).toBe("");
    expect(component.getToolSettingsSummaryItems()).toEqual([]);
    expect(component.getMoleculeTypeLabel("unknown" as never)).toBe("unknown");
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
    expect(component.getRowErrors(0).tool).toContain(
      "only accepts protein input"
    );
  });

  it("should validate DNA, RNA, and ligand formats", () => {
    const rowId = component.entityRows()[0].id;
    component.form.controls.jobName.setValue("test-run");
    component.selectTool("boltz");
    addProteinRow();

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
    component.form.controls.jobName.setValue("test-run");
    component.selectTool("boltz");
    addProteinRow();
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
      errorMessage: "Sequence format is invalid",
    });
  });

  it("should build Boltz settings payload and cover fallback payload branch", () => {
    component.selectTool("boltz");
    component.updateRandomSeed("12345678");
    component.boltzUsePotentials.set(true);
    expect(component["buildToolSettingsPayload"]()).toEqual({
      random_seed: 12345678,
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
    component.form.controls.jobName.setValue("test-run");

    component.selectTool("boltz");
    addProteinRow();
    component.updateRowSequence(rowId, "ACGT");
    component.updateRowMoleculeType(rowId, "dna");
    component.updateRowCopyNumber(rowId, "2");

    expect(component.isStep1Valid()).toBe(true);
    expect(component.generatedFastaContent()).toContain(">seq1_1|dna");
    expect(component.generatedFastaContent()).toContain(">seq1_2|dna");
  });

  it("should tag generated FASTA headers with the molecule type", () => {
    const rowId = component.entityRows()[0].id;
    component.form.controls.jobName.setValue("test-run");
    component.selectTool("boltz");

    component.updateRowSequence(rowId, "ACDEFGHIK");
    component.updateRowMoleculeType(rowId, "protein");
    expect(component.generatedFastaContent()).toBe(">seq1|protein\nACDEFGHIK");

    const secondRowId = addProteinRow();

    component.updateRowSequence(secondRowId, "CC(=O)O");
    component.updateRowMoleculeType(secondRowId, "ligand");
    expect(component.generatedFastaContent()).toContain(
      ">seq2|smiles\nCC(=O)O"
    );

    component.updateRowSequence(secondRowId, "ATP");
    component.updateRowMoleculeType(secondRowId, "ccd");
    expect(component.generatedFastaContent()).toContain(">seq2|ccd\nATP");
  });

  it("should normalize protein sequence content in summary", () => {
    fillValidProteinRow("ac de fg");
    expect(component.entitySummary()[0].sequence).toContain("ACDEFG");
  });

  it("should expose tool-specific settings for all tools", () => {
    component.updateRandomSeed("12345678");
    const randomSeedItem = {
      label: "random_seed",
      value: "12345678",
      fieldName: "random_seed",
    };

    // random_seed is exposed for every tool;
    // colabfold_use_templates is hidden from UI — must NOT appear in summary
    expect(component.getToolSettingsSummaryItems()).toEqual([
      randomSeedItem,
      {
        label: "colabfold_num_recycles",
        value: "3",
        fieldName: "colabfold_num_recycles",
      },
    ]);

    component.selectTool("alphafold2");
    expect(component.getToolSettingsSummaryItems()).toEqual([
      randomSeedItem,
      {
        label: "alphafold2_full_dbs",
        value: "false",
        fieldName: "alphafold2_full_dbs",
      },
    ]);

    component.selectTool("boltz");
    expect(component.getToolSettingsSummaryItems()).toEqual([
      randomSeedItem,
      {
        label: "boltz_use_potentials",
        value: "false",
        fieldName: "boltz_use_potentials",
      },
    ]);
  });

  it("should pre-fill Random Seed with a random 8-digit integer", () => {
    const seed = component.randomSeed();
    expect(seed).toMatch(/^\d{8}$/);
    const value = Number.parseInt(seed, 10);
    expect(value).toBeGreaterThanOrEqual(10000000);
    expect(value).toBeLessThanOrEqual(99999999);
  });

  it("should enforce an integer Random Seed with at most 8 digits for every tool", () => {
    for (const tool of ["colabfold", "alphafold2", "boltz"] as const) {
      component.selectTool(tool);

      component.updateRandomSeed("999999999");
      expect(component.isStep2Valid()).toBe(false);
      expect(component.toolSettingErrors().randomSeed).toContain(
        "at most 8 digits"
      );

      component.updateRandomSeed("-1");
      expect(component.isStep2Valid()).toBe(false);

      component.updateRandomSeed("12345678");
      expect(component.toolSettingErrors().randomSeed).toBeUndefined();
    }
  });

  it("should validate tool settings for AlphaFold2 and ColabFold", () => {
    component.selectTool("alphafold2");
    component.updateRandomSeed("-1");
    expect(component.isStep2Valid()).toBe(false);
    expect(component.toolSettingErrors().randomSeed).toContain(
      "at most 8 digits"
    );

    component.updateRandomSeed("7");
    expect(component.isStep2Valid()).toBe(true);

    component.selectTool("colabfold");
    component.updateColabfoldNumRecycles("0");
    expect(component.isStep2Valid()).toBe(false);

    component.updateColabfoldNumRecycles("4");
    expect(component.isStep2Valid()).toBe(true);
  });

  it("should define the four uniform workflow sections", () => {
    expect(component.sections.map((s) => s.id)).toEqual([
      "select-tool",
      "input-config",
      "tool-settings",
      "review",
    ]);
  });

  it("should track section validity", () => {
    expect(component.isSectionValid("input-config")).toBe(false);
    expect(component.isSectionValid("select-tool")).toBe(true);

    fillValidProteinRow();
    expect(component.isSectionValid("input-config")).toBe(true);
    expect(component.isSectionValid("tool-settings")).toBe(true);
    expect(component.isSectionValid("review")).toBe(true);
  });

  it("should touch entity rows when submitting an invalid form", () => {
    component.submitWorkflow();

    expect(component.stepOneTouched()).toBe(true);
    expect(component.entityRows()[0].touched.sequence).toBe(true);
    expect(fastaUploadService.uploadFastaFile).not.toHaveBeenCalled();
  });

  it("should touch tool settings when submitting with invalid tool settings", () => {
    fillValidProteinRow();
    component.selectTool("alphafold2");
    component.updateRandomSeed("-3");

    component.submitWorkflow();

    expect(component.stepTwoTouched()).toBe(true);
    expect(fastaUploadService.uploadFastaFile).not.toHaveBeenCalled();
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
    component.updateRandomSeed("42");
    component.alphafold2FullDbs.set(true);
    component.isToolAvailable.set(true);

    component.submitWorkflow();

    expect(fastaUploadService.uploadFastaFile).toHaveBeenCalled();
    const datasetUploadRequest =
      datasetUploadService.uploadDataset.calls.mostRecent().args[0];
    const samplesheetId = datasetUploadRequest.formData["id"];
    expect(samplesheetId).toBe("test-run");
    expect(datasetUploadRequest.formData["fasta"]).toBe(
      MOCK_FASTA_RESPONSE.s3Uri
    );
    expect(
      workflowSubmissionService.submitWorkflowWithDataset
    ).toHaveBeenCalled();

    const payload =
      workflowSubmissionService.submitWorkflowWithDataset.calls.mostRecent()
        .args[0];
    expect(payload["runName"]).toBe("test-run");
    expect(payload["tool"]).toBe("alphafold2");
    expect(payload["random_seed"]).toBe(42);
    expect(payload["alphafold2_full_dbs"]).toBe(true);
    expect(payload["fastaContent"]).toContain(">seq1_1");
    expect(payload["fastaFileUrl"]).toBe(MOCK_FASTA_RESPONSE.s3Uri);
    expect(payload["sample_id"]).toBe(samplesheetId);
    expect(component.isFormValid()).toBe(true);
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

  it("should not submit or show a validation banner when input is invalid", () => {
    component.isToolAvailable.set(true);
    component.submitWorkflow();

    expect(component.showAlert()).toBe(false);
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
    expect(component.alertMessage()).toContain("no S3 key was returned");
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

  it("should close alerts and set touched flags for tool settings", () => {
    component.showAlert.set(true);
    component.alertMessage.set("problem");
    component.setRandomSeedTouched();
    component.setColabfoldNumRecyclesTouched();
    component.closeAlert();

    expect(component.showAlert()).toBe(false);
    expect(component.alertMessage()).toBe("");
    expect(component.randomSeedTouched()).toBe(true);
    expect(component.colabfoldNumRecyclesTouched()).toBe(true);
  });

  it("should include tool setting errors in form validation summary error count", () => {
    fillValidProteinRow();
    component.selectTool("alphafold2");
    component.updateRandomSeed("-5");
    component.setRandomSeedTouched();

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

    component.form.controls.jobName.setValue("");
    expect(component.isStep1Valid()).toBe(false);

    component.form.controls.jobName.setValue("my-job");
    expect(component.isStep1Valid()).toBe(true);
  });

  it("should reject jobName that starts with a number", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.form.controls.jobName.setValue("1invalid");
    expect(component.isStep1Valid()).toBe(false);
    expect(component.getJobNameError()).toContain(
      "must not start with a number"
    );
  });

  it("should reject jobName with invalid characters", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.form.controls.jobName.setValue("job@name!");
    expect(component.isStep1Valid()).toBe(false);
    expect(component.getJobNameError()).toContain(
      "must not start with a number"
    );
  });

  it("should reject jobName longer than 60 characters", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");

    component.form.controls.jobName.setValue("a".repeat(61));
    expect(component.isStep1Valid()).toBe(false);
    expect(component.getJobNameError()).toContain("60 characters or fewer");
  });

  it("should show job name required error after touching", () => {
    component.form.controls.jobName.markAsTouched();
    component.form.controls.jobName.setValue("");
    expect(component.form.controls.jobName.touched).toBe(true);

    component.submitWorkflow();
    expect(component.form.controls.jobName.touched).toBe(true);
  });

  it("should keep input-config invalid until jobName is filled", () => {
    const rowId = component.entityRows()[0].id;
    component.updateRowSequence(rowId, "ACDEFGHIK");
    component.form.controls.jobName.setValue("");
    expect(component.isSectionValid("input-config")).toBe(false);

    component.form.controls.jobName.setValue("valid-run");
    expect(component.isSectionValid("input-config")).toBe(true);
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

  it("should reject more than 52 entities counting copies", () => {
    const rowId = fillValidProteinRow("ACDEFGHIK", "52");
    expect(component.totalEntityCount()).toBe(52);
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowCopyNumber(rowId, "53");
    expect(component.totalEntityCount()).toBe(53);
    expect(component.isStep1Valid()).toBe(false);
    expect(component.inputSummaryErrors()).toContain(
      jasmine.stringContaining("Too many entities")
    );
  });

  it("should sum copies across rows toward the entity limit", () => {
    fillValidProteinRow("ACDEFGHIK", "50");
    const secondRowId = addProteinRow();
    component.updateRowCopyNumber(secondRowId, "3");

    expect(component.totalEntityCount()).toBe(53);
    expect(component.inputSummaryErrors()).toContain(
      jasmine.stringContaining("Too many entities")
    );
  });

  it("should require at least one protein entity", () => {
    const rowId = fillValidProteinRow("ACDEFGHIK");
    component.selectTool("boltz");
    expect(component.hasProteinInput()).toBe(true);
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowSequence(rowId, "ACGT");
    component.updateRowMoleculeType(rowId, "dna");

    expect(component.hasProteinInput()).toBe(false);
    expect(component.isStep1Valid()).toBe(false);
    expect(component.inputSummaryErrors()).toContain(
      jasmine.stringContaining("must be a protein")
    );
  });

  it("should count ligand and CCD entities as a fixed size of 30 per copy", () => {
    const rowId = fillValidProteinRow("ACDEFGHIK");
    component.selectTool("boltz");
    const ligandRowId = addProteinRow();
    component.updateRowMoleculeType(ligandRowId, "ligand");
    component.updateRowSequence(ligandRowId, "CC(=O)OC1=CC=CC=C1C(=O)O");
    component.updateRowCopyNumber(ligandRowId, "2");

    // protein (9) + ligand (30 * 2 copies) = 69
    expect(component.totalPredictionSize()).toBe(69);
    expect(rowId).toBeDefined();
  });

  it("should enforce the 2000 size limit for AlphaFold2", () => {
    const rowId = fillValidProteinRow("A".repeat(1999));
    component.selectTool("alphafold2");
    expect(component.predictionSizeLimit()).toBe(2000);
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowSequence(rowId, "A".repeat(2000));
    expect(component.isStep1Valid()).toBe(false);
    expect(component.inputSummaryErrors()).toContain(
      jasmine.stringContaining("must be less than 2000")
    );
  });

  it("should enforce the 4000 size limit for ColabFold and Boltz", () => {
    const rowId = fillValidProteinRow("A".repeat(3999));
    expect(component.selectedTool()).toBe("colabfold");
    expect(component.predictionSizeLimit()).toBe(4000);
    expect(component.isStep1Valid()).toBe(true);

    component.updateRowSequence(rowId, "A".repeat(4000));
    expect(component.isStep1Valid()).toBe(false);
  });

  it("should reduce the Boltz size limit to 2000 when boltz_use_potentials is set", () => {
    const rowId = fillValidProteinRow("A".repeat(3000));
    component.selectTool("boltz");
    expect(component.predictionSizeLimit()).toBe(4000);
    expect(component.isStep1Valid()).toBe(true);

    component.boltzUsePotentials.set(true);
    expect(component.predictionSizeLimit()).toBe(2000);
    expect(component.isStep1Valid()).toBe(false);

    component.selectTool("colabfold");
    expect(component.predictionSizeLimit()).toBe(4000);
    expect(component.isStep1Valid()).toBe(true);
    expect(rowId).toBeDefined();
  });

  it("should omit position labels for SMILES (ligand) sequence cells", () => {
    const proteinCells = component.getSequenceCells("A".repeat(10), "protein");
    expect(proteinCells[9].label).toBe("10");

    const ligandCells = component.getSequenceCells("A".repeat(10), "ligand");
    expect(ligandCells.every((cell) => cell.label === "")).toBe(true);
  });
});
