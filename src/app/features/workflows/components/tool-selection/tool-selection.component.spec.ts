import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { ToolOption, ToolSelectionComponent } from "./tool-selection.component";

const mockTools: ToolOption[] = [
  { id: "tool1", label: "Tool 1", description: "First tool" },
  { id: "tool2", label: "Tool 2", description: "Second tool" },
];

@Component({
  imports: [ReactiveFormsModule, ToolSelectionComponent],
  template: `<app-tool-selection
    [tools]="tools"
    [formControl]="control"
  ></app-tool-selection>`,
})
class ToolSelectionFormHost {
  readonly tools = mockTools;
  readonly control = new FormControl<string | null>(null, Validators.required);
}

describe("ToolSelectionComponent", () => {
  let component: ToolSelectionComponent;
  let fixture: ComponentFixture<ToolSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolSelectionComponent, ToolSelectionFormHost],
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

  it("should show red borders with the required error and clear them after selection", () => {
    const hostFixture = TestBed.createComponent(ToolSelectionFormHost);
    hostFixture.detectChanges();
    const el: HTMLElement = hostFixture.nativeElement;
    const labels = el.querySelectorAll("label");

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector(".border-red-500")).toBeNull();

    hostFixture.componentInstance.control.markAsTouched();
    hostFixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      "Select a tool to continue"
    );
    expect(
      el.querySelector('[role="radiogroup"]')?.getAttribute("aria-invalid")
    ).toBe("true");
    for (const label of labels) {
      expect(label.classList.contains("border-red-500")).toBe(true);
      expect(label.classList.contains("border-gray-300")).toBe(false);
    }

    el.querySelector<HTMLInputElement>('input[value="tool2"]')!.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.control.value).toBe("tool2");
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector(".border-red-500")).toBeNull();
    expect(
      el.querySelector('[role="radiogroup"]')?.getAttribute("aria-invalid")
    ).toBeNull();
    expect(labels[0].classList.contains("border-gray-300")).toBe(true);
    expect(labels[1].classList.contains("border-gray-900")).toBe(true);
  });
});
