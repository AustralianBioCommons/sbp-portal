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

  it("should style completed, active and last sections", () => {
    component.activeSection.set("c");
    component.visitedSections.set(new Set(["a", "b", "c"]));

    // 'a' is visited and precedes the active section -> completed + valid
    expect(component.isSectionCompleted("a")).toBe(true);
    expect(component.circleClasses("a")).toContain("bg-biocommons-primary");
    expect(component.labelClasses("a")).toContain("text-biocommons-primary");
    expect(component.connectorClasses("a")).toContain("bg-biocommons-primary");

    // 'c' is the active, last section
    expect(component.isLast("c")).toBe(true);
    expect(component.circleClasses("c")).toContain("border-biocommons-primary");
  });

  it("should style invalid visited sections in red", () => {
    fixture.componentRef.setInput("isSectionValid", (id: string) => id !== "a");
    component.activeSection.set("c");
    component.visitedSections.set(new Set(["a", "b", "c"]));
    fixture.detectChanges();

    expect(component.sectionValid("a")).toBe(false);
    expect(component.circleClasses("a")).toContain("border-red-600");
    expect(component.circleClasses("a")).toContain("bg-red-600");
  });

  it("should style unvisited sections as gray", () => {
    component.activeSection.set("a");
    component.visitedSections.set(new Set(["a"]));

    expect(component.isSectionVisited("c")).toBe(false);
    expect(component.circleClasses("c")).toContain("border-gray-300");
    expect(component.connectorClasses("c")).toContain("bg-gray-300");
    expect(component.labelClasses("c")).toContain("text-gray-900");
  });

  it("should prevent default and scroll when navigating to a section", () => {
    const element = document.createElement("div");
    const scrollSpy = spyOn(element, "scrollIntoView");
    spyOn(document, "getElementById").and.returnValue(element);
    const event = new Event("click");
    const preventSpy = spyOn(event, "preventDefault");

    component.scrollToSection(event, "b");

    expect(preventSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();
  });

  describe("section tracking via IntersectionObserver", () => {
    let observers: IntersectionObserverCallback[];
    let originalObserver: typeof IntersectionObserver;

    beforeEach(() => {
      observers = [];
      originalObserver = window.IntersectionObserver;
      class FakeIntersectionObserver {
        constructor(callback: IntersectionObserverCallback) {
          observers.push(callback);
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      }
      window.IntersectionObserver =
        FakeIntersectionObserver as unknown as typeof IntersectionObserver;

      fixture = TestBed.createComponent(WorkflowFormComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput("sections", SECTIONS);
      fixture.detectChanges();
    });

    afterEach(() => {
      window.IntersectionObserver = originalObserver;
    });

    function fire(
      index: number,
      entries: Partial<IntersectionObserverEntry>[]
    ) {
      observers[index](
        entries as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    }

    it("activates the deepest intersecting section and marks it visited", () => {
      fire(0, [
        { isIntersecting: true, target: { id: "b" } as Element },
        { isIntersecting: true, target: { id: "c" } as Element },
      ]);

      expect(component.activeSection()).toBe("c");
      expect(component.isSectionVisited("a")).toBe(true);
      expect(component.isSectionVisited("b")).toBe(true);
    });

    it("keeps the current section when nothing is intersecting", () => {
      fire(0, [{ isIntersecting: true, target: { id: "c" } as Element }]);
      fire(0, [{ isIntersecting: false, target: { id: "c" } as Element }]);

      expect(component.activeSection()).toBe("c");
    });

    it("activates the last section and marks all visited when the bottom is reached", () => {
      fire(1, [{ isIntersecting: true }]);

      expect(component.activeSection()).toBe("c");
      expect(component.isSectionVisited("a")).toBe(true);
      expect(component.isSectionVisited("c")).toBe(true);
    });
  });
});
