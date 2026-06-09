import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { environment } from "../../../environments/environment";
import { DatasetUploadService } from "./dataset-upload.service";

describe("DatasetUploadService", () => {
  let service: DatasetUploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DatasetUploadService,
      ],
    });

    service = TestBed.inject(DatasetUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should upload dataset payload to the workflow datasets endpoint", () => {
    const requestBody = {
      formData: { tool: "Boltz", fastaContent: ">entity_1\nAUGC" },
      datasetName: "single-prediction",
      datasetDescription: "generated from workflow form",
    };

    service.uploadDataset(requestBody).subscribe((response) => {
      expect(response.success).toBeTrue();
      expect(response.datasetId).toBe("dataset-123");
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/datasets/upload`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(requestBody);
    req.flush({
      success: true,
      message: "uploaded",
      datasetId: "dataset-123",
    });
  });

  it("should upload interaction screening dataset to the correct endpoint", () => {
    const requestBody = {
      sequences: [
        { id: "querySeq1", group: "query" as const },
        { id: "targetSeq1", group: "target" as const },
      ],
      runId: "my-run",
    };

    service
      .uploadInteractionScreeningDataset(requestBody)
      .subscribe((response) => {
        expect(response.success).toBeTrue();
        expect(response.datasetId).toBe("dataset-456");
      });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/datasets/interaction-screening/upload`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(requestBody);
    req.flush({
      success: true,
      message: "uploaded",
      datasetId: "dataset-456",
    });
  });

  it("should upload bulk prediction dataset to the correct endpoint", () => {
    const requestBody = {
      sequences: [
        { id: "seq1", sequence: "ARNDCQ" },
        { id: "seq2", sequence: "EGHILK" },
      ],
      runId: "bulk-run-1",
    };

    service.uploadBulkPredictionDataset(requestBody).subscribe((response) => {
      expect(response.success).toBeTrue();
      expect(response.datasetId).toBe("dataset-789");
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/datasets/bulk-prediction/upload`
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(requestBody);
    req.flush({
      success: true,
      message: "uploaded",
      datasetId: "dataset-789",
    });
  });
});
