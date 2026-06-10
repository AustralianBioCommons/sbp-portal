import { NO_ERRORS_SCHEMA } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { InputSchemaField } from "../../../cores/input-schema.service";
import { FormFieldComponent } from "./form-field.component";

describe("FormFieldComponent", () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;

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
      providers: [provideHttpClient()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    component.field = mockStringField;
    component.value = "";
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ── Value / blur ────────────────────────────────────────────────────────────

  it("should emit valueChange when input value changes", () => {
    spyOn(component.valueChange, "emit");
    component.onValueChange("new value");
    expect(component.valueChange.emit).toHaveBeenCalledWith("new value");
  });

  it("should emit fieldBlur when input loses focus", () => {
    spyOn(component.fieldBlur, "emit");
    component.onBlur();
    expect(component.fieldBlur.emit).toHaveBeenCalled();
  });

  // ── fieldId ─────────────────────────────────────────────────────────────────

  it("should generate a stable field id", () => {
    expect(component.fieldId).toBe("field-testField");
  });

  // ── Display label ───────────────────────────────────────────────────────────

  it("should format Pdb as PDB in display label", () => {
    component.field = {
      name: "starting_pdb",
      label: "Starting Pdb",
      type: "string",
      required: true,
    };
    expect(component.getDisplayFieldLabel()).toBe("Starting PDB");
  });

  it("should fall back to field name when label is missing", () => {
    component.field = {
      name: "starting Pdb",
      type: "string",
      required: false,
    } as InputSchemaField;
    expect(component.getDisplayFieldLabel()).toBe("starting PDB");
  });

  it("should leave label unchanged when no Pdb token exists", () => {
    component.field = {
      name: "starting_structure",
      label: "Starting Structure",
      type: "string",
      required: true,
    };
    expect(component.getDisplayFieldLabel()).toBe("Starting Structure");
  });

  // ── CSS helpers ─────────────────────────────────────────────────────────────

  it("should return normal input classes when no error", () => {
    const classes = component.getInputClasses();
    expect(classes).toContain("bg-white text-gray-900");
    expect(classes).not.toContain("border-red-500");
  });

  it("should return error input classes when hasError is true", () => {
    component.hasError = true;
    expect(component.getInputClasses()).toContain("border-red-500");
  });

  it("should return normal select classes when no error", () => {
    component.hasError = false;
    const classes = component.getSelectClasses();
    expect(classes).toContain("bg-white text-gray-900");
    expect(classes).not.toContain("border-red-500");
  });

  it("should return error select classes when hasError is true", () => {
    component.hasError = true;
    const classes = component.getSelectClasses();
    expect(classes).toContain("border-red-500 text-red-900");
    expect(classes).not.toContain("bg-white text-gray-900");
  });

  it("should return normal file classes when no error", () => {
    component.hasError = false;
    const classes = component.getFileClasses();
    expect(classes).toContain("file:mr-4");
    expect(classes).not.toContain("file:bg-red-100 file:text-red-700");
  });

  it("should return error file classes when hasError is true", () => {
    component.hasError = true;
    const classes = component.getFileClasses();
    expect(classes).toContain("file:mr-4");
    expect(classes).toContain("file:bg-red-100 file:text-red-700");
  });

  // ── onFileChange — no file ──────────────────────────────────────────────────

  it("should emit null on both outputs when no file is selected", () => {
    spyOn(component.valueChange, "emit");
    spyOn(component.fileSelected, "emit");
    const event = { target: { files: [] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
    expect(component.fileSelected.emit).toHaveBeenCalledWith(null);
  });

  // ── onFileChange — invalid file ─────────────────────────────────────────────

  it("should reject a non-PDB file and show an error", () => {
    spyOn(component.valueChange, "emit");
    spyOn(component.fileSelected, "emit");
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
    expect(component.fileSelected.emit).toHaveBeenCalledWith(null);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain(".pdb extension");
  });

  // ── onFileChange — valid PDB (deferred upload) ──────────────────────────────

  it("should emit fileSelected with the File and valueChange with filename for a valid PDB", () => {
    spyOn(component.valueChange, "emit");
    spyOn(component.fileSelected, "emit");
    const file = new File(["ATOM   1  N   ALA A   1"], "structure.pdb", {
      type: "chemical/x-pdb",
    });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.fileSelected.emit).toHaveBeenCalledWith(file);
    expect(component.valueChange.emit).toHaveBeenCalledWith("structure.pdb");
    // No HTTP request is made — upload is deferred to Next click
    expect(component.showAlert()).toBe(false);
  });

  it("should not show a success alert after picking a valid PDB (no upload yet)", () => {
    const file = new File(["ATOM   1  N   ALA A   1"], "structure.pdb", {
      type: "chemical/x-pdb",
    });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.showAlert()).toBe(false);
  });

  // ── onFileChange — unexpected error ─────────────────────────────────────────

  it("should show an error alert and emit null when validation throws", () => {
    spyOn(component.valueChange, "emit");
    spyOn(component["pdbUploadService"], "validatePdbFile").and.throwError(
      "Unexpected"
    );
    const file = new File(["ATOM   1  N   ALA A   1"], "structure.pdb", {
      type: "chemical/x-pdb",
    });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFileChange(event);

    expect(component.valueChange.emit).toHaveBeenCalledWith(null);
    expect(component.showAlert()).toBe(true);
    expect(component.alertMessage()).toContain("unexpected error");
  });

  // ── Alert ───────────────────────────────────────────────────────────────────

  it("should clear the alert when closeAlert is called", () => {
    component.showAlert.set(true);
    component.alertMessage.set("Test error");

    component.closeAlert();

    expect(component.showAlert()).toBe(false);
    expect(component.alertMessage()).toBe("");
  });

  // ── Field type helpers (state assertions) ───────────────────────────────────

  it("should handle number field type", () => {
    component.field = {
      name: "n",
      label: "N",
      type: "number",
      required: true,
      validation: { min: 0, max: 100 },
    };
    expect(component.field.type).toBe("number");
  });

  it("should handle boolean field type", () => {
    component.field = {
      name: "b",
      label: "B",
      type: "boolean",
      required: false,
    };
    expect(component.field.type).toBe("boolean");
  });

  it("should handle select field with string options", () => {
    component.field = {
      name: "s",
      label: "S",
      type: "string",
      required: true,
      options: ["a", "b", "c"],
    };
    expect(component.field.options?.length).toBe(3);
  });

  it("should handle select field with object options", () => {
    component.field = {
      name: "s",
      label: "S",
      type: "string",
      required: true,
      options: [
        { value: "v1", label: "L1" },
        { value: "v2", label: "L2" },
      ],
    };
    expect(component.field.options?.length).toBe(2);
  });

  it("should reflect errorMessage and hasError inputs", () => {
    component.hasError = true;
    component.errorMessage = "This field is required";
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toBe("This field is required");
  });

  it("should handle file field type", () => {
    component.field = { name: "f", label: "F", type: "file", required: true };
    expect(component.field.type).toBe("file");
  });

  it("should handle field with description", () => {
    component.field = {
      name: "t",
      label: "T",
      type: "string",
      description: "desc",
      required: true,
    };
    expect(component.field.description).toBe("desc");
  });

  it("should handle optional field", () => {
    component.field = {
      name: "o",
      label: "O",
      type: "string",
      required: false,
    };
    expect(component.field.required).toBe(false);
  });
});
