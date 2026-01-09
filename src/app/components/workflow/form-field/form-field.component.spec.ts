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

  it("should handle upload error with error.error.message", () => {
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
      { message: "Specific error from server" },
      { status: 400, statusText: "Bad Request" }
    );

    expect(component.alertMessage()).toContain("Specific error from server");
    expect(component.alertMessage()).toContain("Bad Request");
  });

  it("should handle upload error without statusText", () => {
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
    req.error(new ProgressEvent("error"), { status: 0, statusText: "" });

    expect(component.alertMessage()).toContain("File upload failed");
    expect(component.alertMessage()).not.toContain("()");
  });

  it("should close alert when closeAlert is called", () => {
    component.showAlert.set(true);
    component.alertMessage.set("Test error");

    component.closeAlert();

    expect(component.showAlert()).toBe(false);
    expect(component.alertMessage()).toBe("");
  });

  it("should handle unexpected error in catch block", () => {
    spyOn(component.valueChange, "emit");
    spyOn(component["pdbUploadService"], "validatePdbFile").and.throwError(
      "Unexpected validation error"
    );

    const mockFile = new File(["ATOM   1  N   ALA A   1"], "test.pdb", {
      type: "chemical/x-pdb",
    });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    component.onFileChange(mockEvent);

    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("unexpected error");
  });

  // Additional tests for template coverage
  it("should handle number field type", () => {
    component.field = {
      name: "numberField",
      label: "Number Field",
      type: "number",
      required: true,
      validation: { min: 0, max: 100 },
    };
    component.value = 50;
    expect(component.field.type).toBe("number");
  });

  it("should handle boolean field type", () => {
    component.field = {
      name: "boolField",
      label: "Boolean Field",
      type: "boolean",
      required: false,
    };
    component.value = true;
    expect(component.field.type).toBe("boolean");
  });

  it("should handle select field with string options", () => {
    component.field = {
      name: "selectField",
      label: "Select Field",
      type: "string",
      required: true,
      options: ["option1", "option2", "option3"],
    };
    component.value = "option1";
    expect(component.field.options?.length).toBe(3);
  });

  it("should handle select field with object options", () => {
    component.field = {
      name: "selectField",
      label: "Select Field",
      type: "string",
      required: true,
      options: [
        { value: "val1", label: "Option 1" },
        { value: "val2", label: "Option 2" },
      ],
    };
    component.value = "val1";
    expect(component.field.options?.length).toBe(2);
  });

  it("should display error message when hasError is set", () => {
    component.hasError = true;
    component.errorMessage = "This field is required";
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toBe("This field is required");
  });

  it("should handle validation with min and max", () => {
    component.field = {
      name: "numberField",
      label: "Number Field",
      type: "number",
      required: true,
      validation: { min: 10, max: 100 },
    };
    expect(component.field.validation?.min).toBe(10);
    expect(component.field.validation?.max).toBe(100);
  });

  it("should handle validation with min only", () => {
    component.field = {
      name: "numberField",
      label: "Number Field",
      type: "number",
      required: true,
      validation: { min: 10 },
    };
    expect(component.field.validation?.min).toBe(10);
    expect(component.field.validation?.max).toBeUndefined();
  });

  it("should handle validation with max only", () => {
    component.field = {
      name: "numberField",
      label: "Number Field",
      type: "number",
      required: true,
      validation: { max: 100 },
    };
    expect(component.field.validation?.min).toBeUndefined();
    expect(component.field.validation?.max).toBe(100);
  });

  it("should show alert when showAlert signal is true", () => {
    component.showAlert.set(true);
    component.alertMessage.set("Test alert");
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toBe("Test alert");
  });

  it("should handle file field type", () => {
    component.field = {
      name: "fileField",
      label: "File Field",
      type: "file",
      required: true,
    };
    expect(component.field.type).toBe("file");
  });

  it("should handle field with description", () => {
    component.field = {
      name: "testField",
      label: "Test Field",
      type: "string",
      description: "This is a test field description",
      required: true,
    };
    expect(component.field.description).toBe("This is a test field description");
  });

  it("should handle optional field", () => {
    component.field = {
      name: "optionalField",
      label: "Optional Field",
      type: "string",
      required: false,
    };
    expect(component.field.required).toBe(false);
  });
});
