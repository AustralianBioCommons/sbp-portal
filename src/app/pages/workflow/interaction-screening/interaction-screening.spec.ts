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
import { DatasetUploadService } from "../../../cores/services/dataset-upload.service";
import { WorkflowSubmissionService } from "../../../cores/services/workflow-submission.service";
import InteractionScreeningComponent from "./interaction-screening";

// ── Constants ──────────────────────────────────────────────────────────────

const VALID_QUERY = ">querySeq1\nARNDCQEGHILKMFPSTWYV";
const VALID_TARGET = ">targetSeq1\nARNDCQEGHILKMFPSTWYV";

const MOCK_FASTA_RESPONSE: FastaUploadResponse = {
  success: true,
  message: "ok",
  fileId: "input/interaction-screening/querySeq1.fasta",
  fileName: "querySeq1.fasta",
  s3Uri: "s3://bucket/input/interaction-screening/querySeq1.fasta",
  presignedUrl: "https://signed.example/querySeq1.fasta",
};

const MOCK_DATASET_RESPONSE = {
  success: true,
  message: "ok",
  datasetId: "dataset-123",
  splitOutputDir: "/g/data/yz52/sbp-service/input/interaction_screening/my-job",
};

// ──────────────────────────────────────────────────────────────────────────

describe("InteractionScreeningComponent", () => {
  let component: InteractionScreeningComponent;
  let fixture: ComponentFixture<InteractionScreeningComponent>;
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
      ["uploadInteractionScreeningDataset"]
    );
    datasetUploadService.uploadInteractionScreeningDataset.and.returnValue(
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
      imports: [InteractionScreeningComponent],
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

    fixture = TestBed.createComponent(InteractionScreeningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Helper ─────────────────────────────────────────────────────────────

  function fillValidForm(): void {
    component.form.setValue({
      jobName: "my-job",
      queryFasta: VALID_QUERY,
      targetFasta: VALID_TARGET,
    });
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
    fixture.detectChanges();
    expect(component.isFormValid()).toBe(true);
  });

  // ── 3. submitWorkflow ──────────────────────────────────────────────────

  it("should return early without calling uploadFastaFile when form is invalid", () => {
    component.submitWorkflow();
    expect(fastaUploadService.uploadFastaFile).not.toHaveBeenCalled();
  });

  it("should call uploadFastaFile once with combined sequences when form is valid", () => {
    fillValidForm();
    fixture.detectChanges();

    component.submitWorkflow();

    // all sequences combined into a single FASTA file upload
    expect(fastaUploadService.uploadFastaFile).toHaveBeenCalledTimes(1);
  });

  it("should set isSubmitting to false on successful upload", () => {
    fillValidForm();
    fixture.detectChanges();

    component.submitWorkflow();

    expect(workflowSubmissionService.isSubmitting()).toBe(false);
  });

  it("should submit sample_id matching the uploaded dataset runId", () => {
    fillValidForm();
    fixture.detectChanges();

    component.submitWorkflow();

    const datasetUploadRequest =
      datasetUploadService.uploadInteractionScreeningDataset.calls.mostRecent()
        .args[0];
    expect(datasetUploadRequest.runId).toBe("my-job");

    const payload =
      workflowSubmissionService.submitWorkflowWithDataset.calls.mostRecent()
        .args[0];
    expect(payload["sample_id"]).toBe(datasetUploadRequest.runId);
  });

  it("should show error alert and set isSubmitting false when upload throws", () => {
    fillValidForm();
    fixture.detectChanges();
    fastaUploadService.uploadFastaFile.and.returnValue(
      throwError(() => new Error("upload failed"))
    );

    component.submitWorkflow();

    expect(workflowSubmissionService.isSubmitting()).toBe(false);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("upload failed");
  });

  // ── 4. nextStep ────────────────────────────────────────────────────────

  it("should not advance from step 1 when form is invalid", () => {
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });

  it("should advance from step 1 when form is valid", () => {
    fillValidForm();
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(2);
  });

  // ── 5. previousStep ────────────────────────────────────────────────────

  it("should decrement the step when step > 1", () => {
    component.currentStep.set(2);
    component.previousStep();
    expect(component.currentStep()).toBe(1);
  });

  it("should not decrement below step 1", () => {
    component.previousStep();
    expect(component.currentStep()).toBe(1);
  });

  // ── 6. goToStep ────────────────────────────────────────────────────────

  it("should set the current step via goToStep", () => {
    component.goToStep(3);
    expect(component.currentStep()).toBe(3);
  });

  it("should ignore out-of-range values in goToStep", () => {
    component.goToStep(0);
    expect(component.currentStep()).toBe(1);

    component.goToStep(99);
    expect(component.currentStep()).toBe(1);
  });

  // ── 7. switchTab ───────────────────────────────────────────────────────

  it("should update activeTab when switchTab is called", () => {
    expect(component.activeTab()).toBe("overview");

    component.switchTab("papers");
    expect(component.activeTab()).toBe("papers");
    expect(component.isActiveTab("papers")).toBe(true);
    expect(component.isActiveTab("overview")).toBe(false);

    component.switchTab("output");
    expect(component.activeTab()).toBe("output");
  });

  // ── 8. selectTool ──────────────────────────────────────────────────────

  it("should update selectedTool when selectTool is called", () => {
    component.selectTool("colabfold");
    expect(component.selectedTool()).toBe("colabfold");

    component.selectTool("boltz");
    expect(component.selectedTool()).toBe("boltz");
  });

  // ── 9. closeAlert ──────────────────────────────────────────────────────

  it("should reset alert state when closeAlert is called", () => {
    component.showAlert.set(true);
    component.alertMessage.set("some error");

    component.closeAlert();

    expect(component.showAlert()).toBe(false);
    expect(component.alertMessage()).toBe("");
  });

  // ── 10. hasJobNameError / getJobNameError ──────────────────────────────

  it("should not show job name error when control is untouched", () => {
    expect(component.hasJobNameError()).toBe(false);
  });

  it("should show job name required error when touched and empty", () => {
    component.form.controls.jobName.markAsTouched();
    component.form.controls.jobName.setValue("");

    expect(component.hasJobNameError()).toBe(true);
    expect(component.getJobNameError()).toBe("Job Name is required.");
  });

  it("should show job name maxlength error when touched and too long", () => {
    component.form.controls.jobName.markAsTouched();
    component.form.controls.jobName.setValue("a".repeat(61));

    expect(component.hasJobNameError()).toBe(true);
    expect(component.getJobNameError()).toContain("60 characters or fewer");
  });

  it("should show job name pattern error when touched and starting with a number", () => {
    component.form.controls.jobName.markAsTouched();
    component.form.controls.jobName.setValue("1invalid");

    expect(component.hasJobNameError()).toBe(true);
    expect(component.getJobNameError()).toContain(
      "must not start with a number"
    );
  });

  it("should return empty string from getJobNameError when no errors", () => {
    component.form.controls.jobName.setValue("valid-job");
    expect(component.getJobNameError()).toBe("");
  });

  // ── 11. hasQueryError / getQueryError ─────────────────────────────────

  it("should not show query error when control is untouched", () => {
    expect(component.hasQueryError()).toBe(false);
  });

  it("should show query fasta error when touched and invalid", () => {
    component.form.controls.queryFasta.markAsTouched();
    component.form.controls.queryFasta.setValue("not-valid-fasta!!!");
    fixture.detectChanges();

    expect(component.hasQueryError()).toBe(true);
    expect(component.getQueryError()).toBeTruthy();
  });

  it("should return empty string from getQueryError when no errors", () => {
    component.form.controls.queryFasta.setValue(VALID_QUERY);
    expect(component.getQueryError()).toBe("");
  });

  // ── 12. hasTargetError / getTargetError ───────────────────────────────

  it("should not show target error when control is untouched", () => {
    expect(component.hasTargetError()).toBe(false);
  });

  it("should show target fasta error when touched and invalid", () => {
    component.form.controls.targetFasta.markAsTouched();
    component.form.controls.targetFasta.setValue("not-valid-fasta!!!");
    fixture.detectChanges();

    expect(component.hasTargetError()).toBe(true);
    expect(component.getTargetError()).toBeTruthy();
  });

  it("should return empty string from getTargetError when no errors", () => {
    component.form.controls.targetFasta.setValue(VALID_TARGET);
    expect(component.getTargetError()).toBe("");
  });

  // ── 13. hasProductError / getProductError ─────────────────────────────

  it("should show product error when query × target >= 1000", () => {
    // 32 × 32 = 1024 >= 1000
    const queryFasta = Array.from(
      { length: 32 },
      (_, i) => `>q${i}\nARNDC`
    ).join("\n");
    const targetFasta = Array.from(
      { length: 32 },
      (_, i) => `>t${i}\nARNDC`
    ).join("\n");

    component.form.controls.jobName.setValue("job");
    component.form.controls.queryFasta.setValue(queryFasta);
    component.form.controls.targetFasta.setValue(targetFasta);
    fixture.detectChanges();

    expect(component.hasProductError()).toBe(true);
    const msg = component.getProductError();
    expect(msg).toContain("1024");
    expect(msg).toContain("999");
  });

  it("should not show product error when combination count is below the limit", () => {
    fillValidForm(); // 1 × 1 = 1
    fixture.detectChanges();

    expect(component.hasProductError()).toBe(false);
    expect(component.getProductError()).toBe("");
  });

  // ── 14. selectedToolLabel computed ────────────────────────────────────────

  it("should return the label of the currently selected tool", () => {
    expect(component.selectedToolLabel()).toBe("Boltz");
  });

  // ── 15. canGoNext ─────────────────────────────────────────────────────────

  it("should be true when on an intermediate step", () => {
    fillValidForm();
    fixture.detectChanges();
    component.nextStep();
    expect(component.canGoNext()).toBe(true);
  });

  it("should be false when on the last step", () => {
    fillValidForm();
    fixture.detectChanges();
    component.nextStep();
    component.nextStep();
    expect(component.canGoNext()).toBe(false);
  });

  // ── 16. formSummary computed ──────────────────────────────────────────────

  it("should list job name and both sequence counts when form is valid", () => {
    fillValidForm();
    fixture.detectChanges();
    const summary = component.formSummary();
    expect(summary.find((i) => i.label === "Job Name")?.value).toBe("my-job");
    expect(summary.find((i) => i.label === "Query Sequences")?.value).toContain(
      "1"
    );
    expect(
      summary.find((i) => i.label === "Target Sequences")?.value
    ).toContain("1");
  });

  it("should return empty summary when form is empty", () => {
    expect(component.formSummary()).toEqual([]);
  });

  // ── 17. getFormValidationSummary ──────────────────────────────────────────

  it("should count 3 field errors when form is empty", () => {
    const s = component.getFormValidationSummary();
    expect(s.valid).toBe(false);
    expect(s.errorCount).toBe(3);
    expect(s.rowCount).toBe(3);
  });

  it("should return errorCount 0 when form is valid", () => {
    fillValidForm();
    fixture.detectChanges();
    const s = component.getFormValidationSummary();
    expect(s.valid).toBe(true);
    expect(s.errorCount).toBe(0);
  });

  it("should count the product error in errorCount", () => {
    const queryFasta = Array.from(
      { length: 32 },
      (_, i) => `>q${i}\nARNDC`
    ).join("\n");
    const targetFasta = Array.from(
      { length: 32 },
      (_, i) => `>t${i}\nARNDC`
    ).join("\n");
    component.form.setValue({ jobName: "job", queryFasta, targetFasta });
    fixture.detectChanges();
    expect(component.getFormValidationSummary().errorCount).toBe(1);
  });

  // ── 18. goToJobs ──────────────────────────────────────────────────────────

  it("should delegate to workflowSubmission.goToJobs()", () => {
    component.goToJobs();
    expect(workflowSubmissionService.goToJobs).toHaveBeenCalled();
  });

  // ── 19. loginWithReturnUrl ────────────────────────────────────────────────

  it("should call auth.login with the current URL", () => {
    component.loginWithReturnUrl();
    expect(authService.login).toHaveBeenCalledWith(
      window.location.pathname + window.location.search
    );
  });

  // ── 21. step dedup — completedSteps / visitedSteps ternary branches ───────

  it("should not duplicate completed or visited steps on re-navigation", () => {
    fillValidForm();
    fixture.detectChanges();
    component.nextStep(); // → 2; completedSteps=[1], visitedSteps=[1,2]
    component.goToStep(1); // → 1; visitedSteps stays [1,2]
    component.nextStep(); // → 2 again; no duplication
    expect(component.completedSteps()).toEqual([1]);
    expect(component.visitedSteps()).toEqual([1, 2]);
  });

  // ── 22. submitWorkflow — "Unknown error" fallback ─────────────────────────

  it("should show 'Unknown error' when the upload error has no message", () => {
    fillValidForm();
    fixture.detectChanges();
    fastaUploadService.uploadFastaFile.and.returnValue(throwError(() => ({})));
    component.submitWorkflow();
    expect(component.alertMessage()).toContain("Unknown error");
  });

  // ── 20b. hasDuplicateSequencesError / getDuplicateSequencesError ──────────

  it("should return false and empty string from duplicate-sequences helpers when no duplicates", () => {
    fillValidForm(); // query and target have different headers
    fixture.detectChanges();
    expect(component.hasDuplicateSequencesError()).toBe(false);
    expect(component.getDuplicateSequencesError()).toBe("");
  });

  it("should return true and an error message when query and target share a header", () => {
    component.form.setValue({
      jobName: "my-job",
      queryFasta: VALID_QUERY,
      targetFasta: VALID_QUERY, // same header as query → duplicate
    });
    fixture.detectChanges();
    expect(component.hasDuplicateSequencesError()).toBe(true);
    expect(component.getDuplicateSequencesError()).toBeTruthy();
  });

  // ── 23. submitWorkflow — missing datasetId ────────────────────────────────

  it("should show error and set isSubmitting false when dataset upload returns no datasetId", () => {
    fillValidForm();
    fixture.detectChanges();
    datasetUploadService.uploadInteractionScreeningDataset.and.returnValue(
      of({ success: true, message: "ok" })
    );

    component.submitWorkflow();

    expect(workflowSubmissionService.isSubmitting()).toBe(false);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("no dataset ID");
  });

  // ── 23b. submitWorkflow — missing splitOutputDir ─────────────────────────

  it("should show error and set isSubmitting false when dataset upload returns no splitOutputDir", () => {
    fillValidForm();
    fixture.detectChanges();
    datasetUploadService.uploadInteractionScreeningDataset.and.returnValue(
      of({ success: true, message: "ok", datasetId: "dataset-123" })
    );

    component.submitWorkflow();

    expect(workflowSubmissionService.isSubmitting()).toBe(false);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("split output directory");
  });

  // ── 24. submitWorkflow — workflow launch error callback ───────────────────

  it("should show error when submitWorkflowWithDataset calls the error callback", () => {
    fillValidForm();
    fixture.detectChanges();
    workflowSubmissionService.submitWorkflowWithDataset.and.callFake(
      (
        _options: unknown,
        _datasetId: string,
        errorCallback: (err: Error) => void
      ) => {
        errorCallback(new Error("launch failed"));
      }
    );

    component.submitWorkflow();

    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("launch failed");
    expect(workflowSubmissionService.isSubmitting()).toBe(false);
  });

  it("should show 'Unknown error' when the workflow launch error has no message", () => {
    fillValidForm();
    fixture.detectChanges();
    workflowSubmissionService.submitWorkflowWithDataset.and.callFake(
      (
        _options: unknown,
        _datasetId: string,
        errorCallback: (err: Error) => void
      ) => {
        errorCallback({} as Error);
      }
    );

    component.submitWorkflow();

    expect(component.alertMessage()).toContain("Unknown error");
  });

  // ── creditsInsufficient ──────────────────────────────────────────────

  describe("creditsInsufficient", () => {
    it("flags insufficient credits when the cost exceeds the balance", () => {
      component.creditCost.set(2);
      component["creditsRemaining"].set(1);

      expect(component.creditsInsufficient()).toBe(true);
    });

    it("does not flag insufficient when the cost is unknown", () => {
      component.creditCost.set(null);
      component["creditsRemaining"].set(1);

      expect(component.creditsInsufficient()).toBe(false);
    });

    it("does not flag insufficient when the balance is unknown", () => {
      component.creditCost.set(2);
      component["creditsRemaining"].set(null);

      expect(component.creditsInsufficient()).toBe(false);
    });
  });
});
