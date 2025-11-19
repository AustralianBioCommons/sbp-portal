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
    component.tools = mockTools;
    component.selectedToolId = "tool1";
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

  it("should emit toolSelect when tool is selected", () => {
    spyOn(component.toolSelect, "emit");
    component.onToolSelect("tool2");
    expect(component.toolSelect.emit).toHaveBeenCalledWith("tool2");
  });

  it("should display selected tool correctly", () => {
    fixture.detectChanges();
    const radioButtons = fixture.nativeElement.querySelectorAll(
      'input[type="radio"]'
    );
    const selectedRadio = Array.from(radioButtons).find(
      (radio: HTMLInputElement) => radio.checked
    ) as HTMLInputElement;
    expect(selectedRadio?.value).toBe("tool1");
  });

  it("should handle empty tools array", () => {
    component.tools = [];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("No tools available");
  });

  it("should handle tool selection change", () => {
    spyOn(component.toolSelect, "emit");
    fixture.detectChanges();

    const radioButton = fixture.nativeElement.querySelector(
      'input[value="tool2"]'
    );
    radioButton.click();

    expect(component.toolSelect.emit).toHaveBeenCalledWith("tool2");
  });
});
