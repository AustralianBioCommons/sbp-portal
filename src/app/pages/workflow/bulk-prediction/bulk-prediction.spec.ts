import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
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
import BulkPredictionComponent from "./bulk-prediction";

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
        provideHttpClient(),
        provideHttpClientTesting(),
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

  it("should omit job name from formSummary when jobName is empty", () => {
    component.form.setValue({ jobName: "", fasta: VALID_FASTA });
    const summary = component.formSummary();
    expect(summary.some((item) => item.fieldName === "job_id")).toBe(false);
  });

  it("should use singular 'sequence' when FASTA has exactly one entry", () => {
    component.form.setValue({ jobName: "bulk-job", fasta: VALID_FASTA });
    const summary = component.formSummary();
    const fastaItem = summary.find(
      (item) => item.fieldName === "fasta_entries"
    );
    expect(fastaItem?.value).toBe("1 sequence");
  });

  // ── 13. Submission — missing datasetId branch ──────────────────────────

  it("should show error when dataset upload returns no datasetId", () => {
    fillValidForm();
    datasetUploadService.uploadBulkPredictionDataset.and.returnValue(
      of({ success: true, message: "ok" })
    );
    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("no dataset ID");
  });

  // ── 14. isStepCompleted ────────────────────────────────────────────────

  it("should mark step 2 as always completed", () => {
    expect(component.isStepCompleted(2)).toBe(true);
  });

  it("should reflect completedSteps for non-step-2 ids", () => {
    expect(component.isStepCompleted(1)).toBe(false);
    component.completedSteps.set([1]);
    expect(component.isStepCompleted(1)).toBe(true);
  });

  // ── 15. goToStep out-of-range ─────────────────────────────────────────

  it("should not change step when goToStep called with out-of-range value", () => {
    component.goToStep(0);
    expect(component.currentStep()).toBe(1);

    component.goToStep(99);
    expect(component.currentStep()).toBe(1);
  });

  // ── 16. loginWithReturnUrl ────────────────────────────────────────────

  it("should call auth.login with current url when loginWithReturnUrl is called", () => {
    component.loginWithReturnUrl();
    expect(authService.login).toHaveBeenCalled();
  });

  // ── 17. submitWorkflowWithDataset error callback ──────────────────────

  it("should show error when submitWorkflowWithDataset calls error callback", () => {
    fillValidForm();
    workflowSubmissionService.submitWorkflowWithDataset.and.callFake(
      (_params: unknown, _id: string, onError: (e: Error) => void) => {
        onError(new Error("Launch failed"));
      }
    );
    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("Workflow launch failed");
  });

  it("should use 'Unknown error' when error has no message", () => {
    fillValidForm();
    workflowSubmissionService.submitWorkflowWithDataset.and.callFake(
      (
        _params: unknown,
        _id: string,
        onError: (e: { message?: string }) => void
      ) => {
        onError({});
      }
    );
    component.submitWorkflow();

    expect(component.alertMessage()).toContain("Unknown error");
  });

  // ── 18. formSummary — plural and invalid FASTA ────────────────────────

  it("should use plural 'sequences' when FASTA has more than one entry", () => {
    component.form.setValue({
      jobName: "bulk-job",
      fasta: ">seq1\nARNDCQ\n>seq2\nEGHILK",
    });
    const summary = component.formSummary();
    const fastaItem = summary.find(
      (item) => item.fieldName === "fasta_entries"
    );
    expect(fastaItem?.value).toBe("2 sequences");
  });

  it("should omit fasta_entries from formSummary when FASTA is invalid", () => {
    component.form.setValue({ jobName: "bulk-job", fasta: "" });
    const summary = component.formSummary();
    expect(summary.some((item) => item.fieldName === "fasta_entries")).toBe(
      false
    );
  });

  // ── 19. Step navigation — boundary cases ─────────────────────────────

  it("should not go below step 1 from previousStep", () => {
    expect(component.currentStep()).toBe(1);
    component.previousStep();
    expect(component.currentStep()).toBe(1);
  });

  it("should not advance past the last step", () => {
    fillValidForm();
    component.goToStep(3);
    component.nextStep();
    expect(component.currentStep()).toBe(3);
  });

  it("should not add step to completedSteps if already present", () => {
    fillValidForm();
    component.completedSteps.set([1]);
    component.nextStep();
    expect(component.completedSteps().filter((s) => s === 1).length).toBe(1);
  });

  it("should not add step to visitedSteps if already visited", () => {
    fillValidForm();
    component.visitedSteps.set([1, 2]);
    component.goToStep(2);
    expect(component.visitedSteps().filter((s) => s === 2).length).toBe(1);
  });

  // ── 20. isStepInvalid — non-step-1 ───────────────────────────────────

  it("should return false for isStepInvalid when id is not 1", () => {
    expect(component.isStepInvalid(2)).toBe(false);
    expect(component.isStepInvalid(3)).toBe(false);
  });

  // ── 21. canGoNext ─────────────────────────────────────────────────────

  it("should return true for canGoNext on step 2", () => {
    fillValidForm();
    component.goToStep(2);
    expect(component.canGoNext()).toBe(true);
  });

  it("should return false for canGoNext on last step", () => {
    component.goToStep(3);
    expect(component.canGoNext()).toBe(false);
  });

  // ── 22. hasJobNameError / hasFastaError ───────────────────────────────

  it("should return true for hasJobNameError when control is touched and invalid", () => {
    component.form.controls.jobName.markAsTouched();
    expect(component.hasJobNameError()).toBe(true);
  });

  it("should return false for hasJobNameError when control is untouched", () => {
    expect(component.hasJobNameError()).toBe(false);
  });

  it("should return true for hasFastaError when control is touched and invalid", () => {
    component.form.controls.fasta.markAsTouched();
    expect(component.hasFastaError()).toBe(true);
  });

  it("should return false for hasFastaError when control is untouched", () => {
    expect(component.hasFastaError()).toBe(false);
  });

  it("should return a non-empty string for getFastaError when FASTA is invalid", () => {
    component.form.controls.fasta.setValue(">bad\nXXX123");
    expect(component.getFastaError()).toBeTruthy();
  });

  // ── 23. switchTab / isActiveTab ───────────────────────────────────────

  it("should switch active tab", () => {
    component.switchTab("output");
    expect(component.isActiveTab("output")).toBe(true);
    expect(component.isActiveTab("overview")).toBe(false);
  });

  // ── 24. submitNewJob / goToJobs ───────────────────────────────────────

  it("should call goToJobs on workflowSubmission", () => {
    component.goToJobs();
    expect(workflowSubmissionService.goToJobs).toHaveBeenCalled();
  });
});
