import { NO_ERRORS_SCHEMA } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { InputSchemaField } from "../../../cores/input-schema.service";
import { FormFieldComponent } from "./form-field.component";
import { environment } from "../../../../environments/environment";

describe("FormFieldComponent", () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;
  let httpMock: HttpTestingController;

  const mockStringField: InputSchemaField = {
    name: "testField",
    label: "Test Field",
    type: "string",
    description: "A test field",
    required: true,
    placeholder: "Enter test value",
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    // Set required inputs
    component.field = mockStringField;
    component.value = "";
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should emit valueChange when input value changes", () => {
    spyOn(component.valueChange, "emit");
    component.onValueChange("new value");
    expect(component.valueChange.emit).toHaveBeenCalledWith("new value");
  });

  it("should emit blur event when input loses focus", () => {
    spyOn(component.fieldBlur, "emit");
    component.onBlur();
    expect(component.fieldBlur.emit).toHaveBeenCalled();
  });

  it("should generate a stable field id", () => {
    expect(component.fieldId).toBe("field-testField");
  });

  it("should return proper input classes", () => {
    const classes = component.getInputClasses();
    expect(classes).toContain("border-gray-300");
  });

  it("should return proper error classes when hasError is true", () => {
    component.hasError = true;
    const classes = component.getInputClasses();
    expect(classes).toContain("border-red-300");
  });

  it("should return proper select classes when hasError is false", () => {
    component.hasError = false;
    const classes = component.getSelectClasses();
    expect(classes).toContain("border-gray-300 bg-white text-gray-900");
    expect(classes).not.toContain("border-red-300 bg-red-50 text-red-900");
  });

  it("should return proper select classes when hasError is true", () => {
    component.hasError = true;
    const classes = component.getSelectClasses();
    expect(classes).toContain("border-red-300 bg-red-50 text-red-900");
    expect(classes).not.toContain("border-gray-300 bg-white text-gray-900");
  });

  it("should return proper file classes when hasError is false", () => {
    component.hasError = false;
    const classes = component.getFileClasses();
    expect(classes).toContain("file:mr-4");
    expect(classes).not.toContain("file:bg-red-100 file:text-red-700");
  });

  it("should return proper file classes when hasError is true", () => {
    component.hasError = true;
    const classes = component.getFileClasses();
    expect(classes).toContain("file:mr-4");
    expect(classes).toContain("file:bg-red-100 file:text-red-700");
  });

  it("should handle file change event with non-PDB file", () => {
    spyOn(component.valueChange, "emit");
    const mockFile = new File(["test"], "test.txt", { type: "text/plain" });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    component.onFileChange(mockEvent);
    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("File must have .pdb extension");
  });

  it("should handle file change event with no file", () => {
    spyOn(component.valueChange, "emit");
    const mockEvent = {
      target: { files: [] },
    } as unknown as Event;

    component.onFileChange(mockEvent);
    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
  });

  it("should successfully upload a valid PDB file", () => {
    spyOn(component.valueChange, "emit");
    const mockFile = new File(["ATOM   1  N   ALA A   1"], "test.pdb", {
      type: "chemical/x-pdb",
    });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    const mockResponse = {
      message: "File uploaded successfully",
      success: true,
      fileUrl: "https://example.com/test.pdb",
      fileName: "test.pdb",
    };

    component.onFileChange(mockEvent);

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/pdb/upload`
    );
    expect(req.request.method).toBe("POST");
    req.flush(mockResponse);

    expect(component.valueChange.emit).toHaveBeenCalledWith(
      mockResponse.fileUrl
    );
  });

  it("should use fileName when fileUrl is not available", () => {
    spyOn(component.valueChange, "emit");
    const mockFile = new File(["ATOM   1  N   ALA A   1"], "test.pdb", {
      type: "chemical/x-pdb",
    });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    const mockResponse = {
      message: "File uploaded successfully",
      success: true,
      fileName: "test.pdb",
    };

    component.onFileChange(mockEvent);

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/pdb/upload`
    );
    req.flush(mockResponse);

    expect(component.valueChange.emit).toHaveBeenCalledWith(
      mockResponse.fileName
    );
  });

  it("should use file name when neither fileUrl nor fileName is available", () => {
    spyOn(component.valueChange, "emit");
    const mockFile = new File(["ATOM   1  N   ALA A   1"], "original.pdb", {
      type: "chemical/x-pdb",
    });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    const mockResponse = {
      message: "File uploaded successfully",
      success: true,
    };

    component.onFileChange(mockEvent);

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/pdb/upload`
    );
    req.flush(mockResponse);

    expect(component.valueChange.emit).toHaveBeenCalledWith("original.pdb");
  });

  it("should handle upload error for valid PDB file", () => {
    spyOn(component.valueChange, "emit");
    const mockFile = new File(["ATOM   1  N   ALA A   1"], "test.pdb", {
      type: "chemical/x-pdb",
    });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    component.onFileChange(mockEvent);

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/workflows/pdb/upload`
    );
    req.flush(
      { message: "Upload failed" },
      { status: 500, statusText: "Server Error" }
    );

    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("File upload failed");
  });
});
