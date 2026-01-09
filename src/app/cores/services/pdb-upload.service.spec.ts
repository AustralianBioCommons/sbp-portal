import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { PdbUploadService } from "./pdb-upload.service";
import { environment } from "../../../environments/environment";

describe("PdbUploadService", () => {
  let service: PdbUploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PdbUploadService],
    });
    service = TestBed.inject(PdbUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("uploadPdbFile", () => {
    it("should upload a PDB file with metadata", () => {
      const mockFile = new File(["test content"], "test.pdb", {
        type: "chemical/x-pdb",
      });
      const mockMetadata = {
        fieldName: "target_pdb",
        uploadedAt: "2026-01-08",
      };
      const mockResponse = {
        message: "File uploaded successfully",
        success: true,
        fileId: "file123",
        fileName: "test.pdb",
        fileUrl: "https://example.com/test.pdb",
      };

      service
        .uploadPdbFile({
          file: mockFile,
          metadata: mockMetadata,
        })
        .subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}/api/workflows/pdb/upload`
      );
      expect(req.request.method).toBe("POST");
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });

    it("should upload a PDB file without metadata", () => {
      const mockFile = new File(["test content"], "test.pdb", {
        type: "chemical/x-pdb",
      });
      const mockResponse = {
        message: "File uploaded successfully",
        success: true,
        fileName: "test.pdb",
      };

      service
        .uploadPdbFile({
          file: mockFile,
        })
        .subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

      const req = httpMock.expectOne(
        `${environment.apiBaseUrl}/api/workflows/pdb/upload`
      );
      expect(req.request.method).toBe("POST");
      req.flush(mockResponse);
    });
  });

  describe("validatePdbFile", () => {
    it("should validate a valid PDB file", () => {
      const mockFile = new File(["test"], "test.pdb", {
        type: "chemical/x-pdb",
      });
      const result = service.validatePdbFile(mockFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject a file without .pdb extension", () => {
      const mockFile = new File(["test"], "test.txt", {
        type: "text/plain",
      });
      const result = service.validatePdbFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("File must have .pdb extension");
    });

    it("should reject a file with uppercase .PDB extension", () => {
      const mockFile = new File(["test"], "test.PDB", {
        type: "chemical/x-pdb",
      });
      const result = service.validatePdbFile(mockFile);
      expect(result.valid).toBe(true);
    });

    it("should reject a file larger than 10MB", () => {
      const largeContent = new Array(11 * 1024 * 1024).fill("a").join("");
      const mockFile = new File([largeContent], "large.pdb", {
        type: "chemical/x-pdb",
      });
      const result = service.validatePdbFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("File size exceeds 10MB limit");
    });

    it("should accept a file at exactly 10MB", () => {
      const content = new Array(10 * 1024 * 1024).fill("a").join("");
      const mockFile = new File([content], "exact.pdb", {
        type: "chemical/x-pdb",
      });
      const result = service.validatePdbFile(mockFile);
      expect(result.valid).toBe(true);
    });
  });
});
