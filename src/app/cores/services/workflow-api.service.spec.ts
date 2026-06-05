import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { environment } from "../../../environments/environment";
import { WorkflowApiService } from "./workflow-api.service";

describe("WorkflowApiService", () => {
  let service: WorkflowApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkflowApiService,
      ],
    });

    service = TestBed.inject(WorkflowApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should launch a workflow with launch config, form data, and dataset id", () => {
    const launch = {
      workflow: "interaction-screening" as const,
      tool: "boltz" as const,
      configProfiles: ["singularity"],
      runName: "test-run",
      paramsText: null,
    };
    const formData = {
      workflow: "interaction-screening" as const,
      tool: "boltz" as const,
      runName: "test-run",
      sample_id: "test-run",
    };

    service
      .launchWorkflow(launch, formData, "dataset-1")
      .subscribe((response) => {
        expect(response.runId).toBe("run-1");
        expect(response.status).toBe("SUBMITTED");
      });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/launch`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({
      launch,
      datasetId: "dataset-1",
      formData,
    });
    req.flush({
      message: "submitted",
      runId: "run-1",
      status: "SUBMITTED",
      submitTime: "2026-03-26T10:00:00Z",
    });
  });
});
