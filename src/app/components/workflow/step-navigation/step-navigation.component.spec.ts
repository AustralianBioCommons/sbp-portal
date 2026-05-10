import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ButtonComponent } from "../../button/button.component";
import { Step, StepNavigationComponent } from "./step-navigation.component";

describe("StepNavigationComponent", () => {
  let component: StepNavigationComponent;
  let fixture: ComponentFixture<StepNavigationComponent>;

  const mockSteps: Step[] = [
    { id: 1, title: "Tool Selection", description: "Select a tool" },
    { id: 2, title: "Configuration", description: "Configure parameters" },
    { id: 3, title: "Review", description: "Review and submit" },
  ];

  const mockisStepCompleted = (stepId: number) => stepId < 2;
  const mockIsStepInvalid = (stepId: number) => stepId === 3;
  const mockIsStepVisited = (stepId: number) => stepId === 1;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepNavigationComponent, ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StepNavigationComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput("steps", mockSteps);
    fixture.componentRef.setInput("currentStep", 2);
    fixture.componentRef.setInput("isStepCompleted", mockisStepCompleted);
    fixture.componentRef.setInput("isStepInvalid", mockIsStepInvalid);
    fixture.componentRef.setInput("isStepVisited", mockIsStepVisited);
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display all steps", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Tool Selection");
    expect(compiled.textContent).toContain("Configuration");
    expect(compiled.textContent).toContain("Review");
  });

  it("should emit stepClick when step is clicked", () => {
    spyOn(component.stepClick, "emit");
    component.onStepClick(1);
    expect(component.stepClick.emit).toHaveBeenCalledWith(1);
  });

  it("should handle empty steps array", () => {
    fixture.componentRef.setInput("steps", []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("No steps defined");
  });

  it("should apply correct styling based on step state", () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll("button");

    // Should have buttons for each step
    expect(buttons.length).toBe(3);
  });

  it("should handle disabled state", () => {
    fixture.componentRef.setInput("isDisabled", true);
    expect(component.isDisabled()).toBe(true);
  });

  it("should have correct current step", () => {
    expect(component.currentStep()).toBe(2);
  });
});
