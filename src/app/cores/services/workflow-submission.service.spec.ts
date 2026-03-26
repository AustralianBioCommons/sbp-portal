import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { WorkflowApiService } from "./workflow-api.service";
import { WorkflowSubmissionService } from "./workflow-submission.service";

describe("WorkflowSubmissionService", () => {
  let service: WorkflowSubmissionService;
  let workflowApiService: jasmine.SpyObj<WorkflowApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    workflowApiService = jasmine.createSpyObj("WorkflowApiService", [
      "launchWorkflow",
    ]);
    router = jasmine.createSpyObj("Router", ["navigate"]);

    TestBed.configureTestingModule({
      providers: [
        WorkflowSubmissionService,
        { provide: WorkflowApiService, useValue: workflowApiService },
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(WorkflowSubmissionService);
  });

  afterEach(() => {
    service.resetSubmissionState();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should require dataset id when submitting", () => {
    const onError = jasmine.createSpy("onError");

    service.submitWorkflowWithDataset({ tool: "Boltz" }, undefined, onError);

    expect(onError).toHaveBeenCalled();
    expect(workflowApiService.launchWorkflow).not.toHaveBeenCalled();
    expect(service.isSubmitting()).toBeFalse();
  });

  it("should fall back to alert when dataset id is missing and no error handler is provided", () => {
    const alertSpy = spyOn(window, "alert");

    service.submitWorkflowWithDataset({ tool: "Boltz" });

    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to launch workflow: datasetId is required to launch workflow."
    );
  });

  it("should delegate submitWorkflow to submitWorkflowWithDataset", () => {
    const submitSpy = spyOn(service, "submitWorkflowWithDataset");

    service.submitWorkflow({ tool: "ColabFold" });

    expect(submitSpy).toHaveBeenCalledWith(
      { tool: "ColabFold" },
      undefined,
      undefined
    );
  });

  it("should submit workflow with normalized dataset id and show success dialog", () => {
    workflowApiService.launchWorkflow.and.returnValue(
      of({
        message: "submitted",
        runId: "run-123",
        status: "SUBMITTED",
        submitTime: "2026-03-26T10:00:00Z",
      })
    );

    service.submitWorkflowWithDataset(
      { tool: "AlphaFold2", configProfiles: ["docker"] },
      " dataset-123 "
    );

    expect(workflowApiService.launchWorkflow).toHaveBeenCalled();
    const [launch, formData, datasetId] =
      workflowApiService.launchWorkflow.calls.mostRecent().args;
    expect(datasetId).toBe("dataset-123");
    expect(formData).toEqual({
      tool: "AlphaFold2",
      configProfiles: ["docker"],
    });
    expect(launch.tool).toBe("AlphaFold2");
    expect(launch.configProfiles).toEqual(["docker"]);
    expect(launch.runName).toContain("run-");
    expect(launch.paramsText).toBeNull();
    expect(service.isSubmitting()).toBeFalse();
    expect(service.showSuccessDialog()).toBeTrue();
    expect(service.successDialogData()).toEqual({
      runId: "run-123",
      status: "SUBMITTED",
    });
  });

  it("should use default launch values when optional form data is absent", () => {
    workflowApiService.launchWorkflow.and.returnValue(
      of({
        message: "submitted",
        runId: "run-456",
        status: "SUBMITTED",
        submitTime: "2026-03-26T10:00:00Z",
      })
    );

    service.submitWorkflowWithDataset({}, "dataset-456");

    const [launch] = workflowApiService.launchWorkflow.calls.mostRecent().args;
    expect(launch.tool).toBe("BindCraft");
    expect(launch.configProfiles).toEqual(["singularity"]);
    expect(launch.runName).toContain("run-");
  });

  it("should call custom error handler when workflow launch fails", () => {
    const onError = jasmine.createSpy("onError");
    workflowApiService.launchWorkflow.and.returnValue(
      throwError(() => new Error("launch failed"))
    );

    service.submitWorkflowWithDataset({ tool: "Boltz" }, "dataset-789", onError);

    expect(onError).toHaveBeenCalledWith(jasmine.any(Error));
    expect(service.isSubmitting()).toBeFalse();
    expect(service.showSuccessDialog()).toBeFalse();
  });

  it("should fall back to alert when workflow launch fails without custom handler", () => {
    const alertSpy = spyOn(window, "alert");
    workflowApiService.launchWorkflow.and.returnValue(
      throwError(() => new Error("launch failed"))
    );

    service.submitWorkflowWithDataset({ tool: "Boltz" }, "dataset-789");

    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to launch workflow: launch failed"
    );
  });

  it("should navigate to home and jobs after closing success dialog", () => {
    service.showSuccessDialog.set(true);

    service.goToHome();
    expect(service.showSuccessDialog()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(["/"]);

    service.showSuccessDialog.set(true);
    service.goToJobs();
    expect(service.showSuccessDialog()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(["/jobs"]);
  });

  it("should close and reset submission state", () => {
    service.isSubmitting.set(true);
    service.showSuccessDialog.set(true);
    service.successDialogData.set({ runId: "run-1", status: "SUBMITTED" });

    service.closeSuccessDialog();
    expect(service.showSuccessDialog()).toBeFalse();

    service.resetSubmissionState();
    expect(service.isSubmitting()).toBeFalse();
    expect(service.showSuccessDialog()).toBeFalse();
    expect(service.successDialogData()).toBeNull();
  });
});
