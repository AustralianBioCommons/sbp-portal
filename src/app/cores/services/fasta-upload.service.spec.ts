import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { FastaUploadService } from "./fasta-upload.service";

describe("FastaUploadService", () => {
  let service: FastaUploadService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FastaUploadService],
    });
    service = TestBed.inject(FastaUploadService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should POST the file as FormData to the upload endpoint", () => {
    const mockFile = new File(["content"], "test.fasta", {
      type: "text/plain",
    });
    const mockResponse = {
      message: "FASTA file uploaded successfully",
      success: true,
      fileId: "input/test.fasta",
      fileName: "test.fasta",
      s3Uri: "s3://bucket/input/test.fasta",
      presignedUrl: "https://signed.example/test.fasta",
    };

    service.uploadFastaFile({ file: mockFile }).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.fileId).toBe("input/test.fasta");
      expect(res.s3Uri).toBe("s3://bucket/input/test.fasta");
    });

    const req = httpController.expectOne((r) =>
      r.url.includes("/fasta/upload")
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockResponse);
  });

  it("should append folder to FormData when folder is provided", () => {
    const mockFile = new File(["content"], "querySeq1.fasta", {
      type: "text/plain",
    });
    const mockResponse = {
      message: "FASTA file uploaded successfully",
      success: true,
      fileId: "input/interaction-screening/querySeq1.fasta",
      fileName: "querySeq1.fasta",
      s3Uri: "s3://bucket/input/interaction-screening/querySeq1.fasta",
      presignedUrl:
        "https://signed.example/input/interaction-screening/querySeq1.fasta",
    };

    let emittedSuccess = false;

    service
      .uploadFastaFile({ file: mockFile, folder: "input/interaction-screening" })
      .subscribe((res) => {
        emittedSuccess = res.success;
      });

    const req = httpController.expectOne((r) =>
      r.url.includes("/fasta/upload")
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockResponse);
    expect(emittedSuccess).toBe(true);
  });

  it("should propagate HTTP errors to the caller", () => {
    const mockFile = new File(["content"], "test.fasta", {
      type: "text/plain",
    });
    let errorCaught = false;

    service.uploadFastaFile({ file: mockFile }).subscribe({
      next: () => fail("Expected error"),
      error: () => {
        errorCaught = true;
      },
    });

    const req = httpController.expectOne((r) =>
      r.url.includes("/fasta/upload")
    );
    req.flush("S3 error", { status: 502, statusText: "Bad Gateway" });
    expect(errorCaught).toBe(true);
  });
});
