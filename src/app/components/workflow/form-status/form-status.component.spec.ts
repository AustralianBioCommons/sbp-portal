import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  FormStatusComponent,
  FormValidationSummary,
} from "./form-status.component";

describe("FormStatusComponent", () => {
  let component: FormStatusComponent;
  let fixture: ComponentFixture<FormStatusComponent>;

  const mockValidationSummary: FormValidationSummary = {
    valid: true,
    errorCount: 0,
    rowCount: 5,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormStatusComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.isValid = true;
    component.validationSummary = mockValidationSummary;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display valid status when form is valid", () => {
    component.isValid = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Valid");
    expect(compiled.textContent).toContain("All fields valid");
  });

  it("should display invalid status when form is invalid", () => {
    component.isValid = false;
    component.validationSummary = {
      valid: false,
      errorCount: 2,
      rowCount: 5,
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Invalid");
    expect(compiled.textContent).toContain("2 validation errors");
  });

  it("should display singular error message for single error", () => {
    component.isValid = false;
    component.validationSummary = {
      valid: false,
      errorCount: 1,
      rowCount: 3,
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("1 validation error");
    expect(compiled.textContent).not.toContain("1 validation errors");
  });

  it("should show error message when there are validation errors", () => {
    component.isValid = false;
    component.validationSummary = {
      valid: false,
      errorCount: 3,
      rowCount: 5,
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Please fix the validation errors");
  });

  it("should not show error message when form is valid", () => {
    component.isValid = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain(
      "Please fix the validation errors"
    );
  });
});
