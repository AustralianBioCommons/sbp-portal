import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ToolOption, ToolSelectionComponent } from "./tool-selection.component";

describe("ToolSelectionComponent", () => {
  let component: ToolSelectionComponent;
  let fixture: ComponentFixture<ToolSelectionComponent>;

  const mockTools: ToolOption[] = [
    { id: "tool1", label: "Tool 1", description: "First tool" },
    { id: "tool2", label: "Tool 2", description: "Second tool" },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolSelectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolSelectionComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput("tools", mockTools);
    component.writeValue("tool1");
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display all tools", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Tool 1");
    expect(compiled.textContent).toContain("Tool 2");
  });

  it("should notify the registered form change callback when tool is selected", () => {
    const onChange = jasmine.createSpy("onChange");
    component.registerOnChange(onChange);
    component.onToolSelect("tool2");
    expect(onChange).toHaveBeenCalledWith("tool2");
  });

  it("should display selected tool correctly", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const radioButtons = compiled.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]'
    );
    const selectedRadio = Array.from(radioButtons).find(
      (radio) => radio.checked
    );
    expect(selectedRadio?.value).toBe("tool1");
  });

  it("should handle empty tools array", () => {
    fixture.componentRef.setInput("tools", []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("No tools available");
  });

  it("should handle tool selection change", () => {
    const onChange = jasmine.createSpy("onChange");
    component.registerOnChange(onChange);
    fixture.detectChanges();

    const radioButton = fixture.nativeElement.querySelector(
      'input[value="tool2"]'
    );
    radioButton.click();

    expect(onChange).toHaveBeenCalledWith("tool2");
  });
});
