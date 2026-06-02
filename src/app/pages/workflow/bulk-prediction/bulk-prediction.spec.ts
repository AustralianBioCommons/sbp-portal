import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, throwError } from "rxjs";
import { AuthService } from "../../../cores/auth.service";
import {
  FastaUploadResponse,
  FastaUploadService,
} from "../../../cores/services/fasta-upload.service";
import {
  DatasetUploadResponse,
  DatasetUploadService,
} from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import { BulkPredictionComponent } from "./bulk-prediction";

// ── Constants ──────────────────────────────────────────────────────────────

const VALID_FASTA = ">seq1\nARNDCQEGHILKMFPSTWYV";
const VALID_MULTIMER_FASTA = ">multimer1\nARNDCQ:EGHILK";

const MOCK_FASTA_RESPONSE: FastaUploadResponse = {
  success: true,
  message: "ok",
  fileId: "input/bulk-prediction/sequences.fasta",
  fileName: "sequences.fasta",
  s3Uri: "s3://bucket/input/bulk-prediction/sequences.fasta",
  presignedUrl: "https://signed.example/sequences.fasta",
};

const MOCK_DATASET_RESPONSE: DatasetUploadResponse = {
  success: true,
  message: "ok",
  datasetId: "dataset-456",
};

// ──────────────────────────────────────────────────────────────────────────

describe("BulkPredictionComponent", () => {
  let component: BulkPredictionComponent;
  let fixture: ComponentFixture<BulkPredictionComponent>;
  let fastaUploadService: jasmine.SpyObj<FastaUploadService>;
  let datasetUploadService: jasmine.SpyObj<DatasetUploadService>;
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
    fastaUploadService = jasmine.createSpyObj<FastaUploadService>(
      "FastaUploadService",
      ["uploadFastaFile"]
    );
    fastaUploadService.uploadFastaFile.and.returnValue(of(MOCK_FASTA_RESPONSE));

    datasetUploadService = jasmine.createSpyObj<DatasetUploadService>(
      "DatasetUploadService",
      ["uploadBulkPredictionDataset"]
    );
    datasetUploadService.uploadBulkPredictionDataset.and.returnValue(
      of(MOCK_DATASET_RESPONSE)
    );

    workflowSubmissionService = {
      isSubmitting: signal(false),
      showSuccessDialog: signal(false),
      successDialogData: signal(null),
      submitWorkflowWithDataset: jasmine
        .createSpy("submitWorkflowWithDataset")
        .and.callFake(() => {
          workflowSubmissionService.isSubmitting.set(false);
        }),
      goToJobs: jasmine.createSpy("goToJobs"),
    };

    authService = {
      isAuthenticated$: of(true),
      canExecuteWorkflows$: of(true),
      profileUrl: "https://example.com/profile",
      login: jasmine.createSpy("login"),
    };

    await TestBed.configureTestingModule({
      imports: [BulkPredictionComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: FastaUploadService, useValue: fastaUploadService },
        { provide: DatasetUploadService, useValue: datasetUploadService },
        {
          provide: WorkflowSubmissionService,
          useValue: workflowSubmissionService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkPredictionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Helper ─────────────────────────────────────────────────────────────

  function fillValidForm(): void {
    component.form.setValue({ jobName: "bulk-job", fasta: VALID_FASTA });
  }

  // ── 1. Creation ────────────────────────────────────────────────────────

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ── 2. isFormValid ─────────────────────────────────────────────────────

  it("should report form invalid when empty", () => {
    expect(component.isFormValid()).toBe(false);
  });

  it("should report form valid when all fields are filled correctly", () => {
    fillValidForm();
    expect(component.isFormValid()).toBe(true);
  });

  // ── 3. Tool selection ──────────────────────────────────────────────────

  it("should default selected tool to boltz", () => {
    expect(component.selectedTool()).toBe("boltz");
  });

  it("should switch selected tool when selectTool is called", () => {
    component.selectTool("colabfold");
    expect(component.selectedTool()).toBe("colabfold");
    expect(component.selectedToolLabel()).toBe("ColabFold");
  });

  // ── 4. FASTA validation — unique headers ───────────────────────────────

  it("should be invalid when FASTA has duplicate headers", () => {
    component.form.setValue({
      jobName: "bulk-job",
      fasta: ">seq1\nARNDCQ\n>seq1\nEGHILK",
    });
    expect(component.isFormValid()).toBe(false);
    expect(component.form.controls.fasta.errors?.["fasta"]).toContain(
      "Duplicate FASTA header"
    );
  });

  // ── 5. FASTA validation — entry limit ─────────────────────────────────

  it("should be invalid when FASTA exceeds 1000 entries", () => {
    const entries = Array.from(
      { length: 1001 },
      (_, i) => `>seq${i}\nARNDCQ`
    ).join("\n");
    component.form.setValue({ jobName: "bulk-job", fasta: entries });
    expect(component.isFormValid()).toBe(false);
    expect(component.form.controls.fasta.errors?.["fasta"]).toContain(
      "Too many FASTA entries"
    );
  });

  // ── 6. FASTA validation — sequence length ─────────────────────────────

  it("should be invalid when a sequence exceeds 1000 amino-acid characters", () => {
    const longSeq = "A".repeat(1001);
    component.form.setValue({
      jobName: "bulk-job",
      fasta: `>longseq\n${longSeq}`,
    });
    expect(component.isFormValid()).toBe(false);
    expect(component.form.controls.fasta.errors?.["fasta"]).toContain(
      "amino-acid characters"
    );
  });

  // ── 7. FASTA validation — multimer delimiter ───────────────────────────

  it("should accept a valid multimer sequence with : delimiter", () => {
    component.form.setValue({
      jobName: "bulk-job",
      fasta: VALID_MULTIMER_FASTA,
    });
    expect(component.isFormValid()).toBe(true);
  });

  it("should reject a sequence with a leading colon", () => {
    component.form.setValue({
      jobName: "bulk-job",
      fasta: ">bad\n:ARNDCQ",
    });
    expect(component.isFormValid()).toBe(false);
  });

  it("should reject a sequence with consecutive colons", () => {
    component.form.setValue({
      jobName: "bulk-job",
      fasta: ">bad\nARNDCQ::EGHILK",
    });
    expect(component.isFormValid()).toBe(false);
  });

  // ── 8. FASTA validation — invalid characters ──────────────────────────

  it("should be invalid when sequence contains non-canonical amino acids", () => {
    component.form.setValue({
      jobName: "bulk-job",
      fasta: ">seq1\nARNDCQXYZ",
    });
    expect(component.isFormValid()).toBe(false);
    expect(component.form.controls.fasta.errors?.["fasta"]).toContain(
      "invalid characters"
    );
  });

  // ── 9. Step navigation ─────────────────────────────────────────────────

  it("should start on step 1", () => {
    expect(component.currentStep()).toBe(1);
  });

  it("should not advance to step 2 when form is invalid", () => {
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });

  it("should advance to step 2 when form is valid", () => {
    fillValidForm();
    component.nextStep();
    expect(component.currentStep()).toBe(2);
  });

  it("should go back to step 1 from step 2", () => {
    fillValidForm();
    component.goToStep(2);
    component.previousStep();
    expect(component.currentStep()).toBe(1);
  });

  // ── 10. Submission ─────────────────────────────────────────────────────

  it("should not submit when form is invalid", () => {
    component.submitWorkflow();
    expect(fastaUploadService.uploadFastaFile).not.toHaveBeenCalled();
  });

  it("should upload FASTA and dataset then submit workflow on valid submission", () => {
    fillValidForm();
    component.submitWorkflow();

    expect(fastaUploadService.uploadFastaFile).toHaveBeenCalledWith(
      jasmine.objectContaining({ folder: "input/bulk-prediction" })
    );
    expect(
      datasetUploadService.uploadBulkPredictionDataset
    ).toHaveBeenCalledWith(
      jasmine.objectContaining({
        runId: "bulk-job",
        sequences: jasmine.arrayContaining([
          jasmine.objectContaining({ id: "seq1" }),
        ]),
      })
    );
    expect(
      workflowSubmissionService.submitWorkflowWithDataset
    ).toHaveBeenCalledWith(
      jasmine.objectContaining({ runName: "bulk-job" }),
      "dataset-456",
      jasmine.any(Function)
    );
  });

  it("should show error alert when FASTA upload fails", () => {
    fillValidForm();
    fastaUploadService.uploadFastaFile.and.returnValue(
      throwError(() => new Error("Upload failed"))
    );
    component.submitWorkflow();
    expect(component.showAlert()).toBe(true);
  });

  it("should show error alert when dataset upload fails", () => {
    fillValidForm();
    datasetUploadService.uploadBulkPredictionDataset.and.returnValue(
      throwError(() => new Error("Dataset upload failed"))
    );
    component.submitWorkflow();
    expect(component.showAlert()).toBe(true);
  });

  // ── 11. Alert ──────────────────────────────────────────────────────────

  it("should dismiss the alert when closeAlert is called", () => {
    component["showError"]("Something went wrong");
    expect(component.showAlert()).toBe(true);
    component.closeAlert();
    expect(component.showAlert()).toBe(false);
  });

  // ── 12. formSummary ────────────────────────────────────────────────────

  it("should include job name, tool, and entry count in formSummary", () => {
    fillValidForm();
    const summary = component.formSummary();
    expect(summary.some((item) => item.fieldName === "job_id")).toBe(true);
    expect(summary.some((item) => item.fieldName === "tool")).toBe(true);
    expect(summary.some((item) => item.fieldName === "fasta_entries")).toBe(
      true
    );
  });
});
