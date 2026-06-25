import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  WorkflowFormComponent,
  WorkflowSection,
} from "./workflow-form.component";

const SECTIONS: WorkflowSection[] = [
  { id: "a", label: "Section A", mobileLabel: "A" },
  { id: "b", label: "Section B", mobileLabel: "B" },
  { id: "c", label: "Section C" },
];

describe("WorkflowFormComponent", () => {
  let component: WorkflowFormComponent;
  let fixture: ComponentFixture<WorkflowFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("sections", SECTIONS);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should track a valid active section and mark visited sections", () => {
    expect(SECTIONS.map((s) => s.id)).toContain(component.activeSection());
    expect(component.isSectionVisited("a")).toBe(true);
  });

  it("should render a nav label for every section", () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("Section A");
    expect(text).toContain("Section B");
    expect(text).toContain("Section C");
  });

  it("should emit submit when onSubmit is called", () => {
    let emitted = false;
    component.submitted.subscribe(() => (emitted = true));
    component.onSubmit();
    expect(emitted).toBe(true);
  });

  it("should scroll to the first invalid section", () => {
    const element = document.createElement("div");
    const scrollSpy = spyOn(element, "scrollIntoView");
    const getByIdSpy = spyOn(document, "getElementById").and.returnValue(
      element
    );
    fixture.componentRef.setInput("isSectionValid", (id: string) => id !== "b");

    component.scrollToFirstInvalidSection();

    expect(getByIdSpy).toHaveBeenCalledWith("b");
    expect(scrollSpy).toHaveBeenCalled();
  });

  it("should not disable the submit button by default", () => {
    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector("button[type='button']:last-of-type");
    const buttons = fixture.nativeElement.querySelectorAll("button");
    const submitButton = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
    expect(button).toBeTruthy();
  });

  it("should disable submit when disabled input is set", () => {
    fixture.componentRef.setInput("disabled", true);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll("button");
    const submitButton = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it("should disable submit when a section is invalid", () => {
    fixture.componentRef.setInput("isSectionValid", (id: string) => id !== "b");
    fixture.detectChanges();
    expect(component.allSectionsValid()).toBe(false);
    const buttons = fixture.nativeElement.querySelectorAll("button");
    const submitButton = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });
});
