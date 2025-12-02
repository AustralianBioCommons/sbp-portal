import { NO_ERRORS_SCHEMA } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
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
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.field = mockStringField;
    component.value = "";
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

  it("should handle file change event", () => {
    spyOn(component.valueChange, "emit");
    const mockFile = new File(["test"], "test.txt", { type: "text/plain" });
    const mockEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;

    component.onFileChange(mockEvent);
    expect(component.valueChange.emit).toHaveBeenCalledWith("test.txt");
  });

  it("should handle file change event with no file", () => {
    spyOn(component.valueChange, "emit");
    const mockEvent = {
      target: { files: [] },
    } as unknown as Event;

    component.onFileChange(mockEvent);
    expect(component.valueChange.emit).toHaveBeenCalledWith("");
  });
});
