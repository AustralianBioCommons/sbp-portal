import { ComponentFixture, TestBed } from "@angular/core/testing";
import { StepContentComponent } from "./step-content.component";

describe("StepContentComponent", () => {
  let component: StepContentComponent;
  let fixture: ComponentFixture<StepContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepContentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StepContentComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display title when provided", () => {
    fixture.componentRef.setInput("title", "Test Step Title");
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Step Title");
  });

  it("should display description when provided", () => {
    fixture.componentRef.setInput("description", "This is a test description");
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("This is a test description");
  });

  it("should not display title when not provided", () => {
    fixture.componentRef.setInput("title", "");
    fixture.detectChanges();
    const titleElement = fixture.nativeElement.querySelector("h5");
    expect(titleElement).toBeFalsy();
  });

  it("should not display description when not provided", () => {
    fixture.componentRef.setInput("description", "");
    fixture.detectChanges();
    const descriptionElement = fixture.nativeElement.querySelector("p");
    expect(descriptionElement).toBeFalsy();
  });

  it("should apply custom content class when provided", () => {
    fixture.componentRef.setInput("contentClass", "custom-class");
    fixture.detectChanges();
    const contentDiv = fixture.nativeElement.querySelector(".custom-class");
    expect(contentDiv).toBeTruthy();
  });

  it("should have empty content class by default", () => {
    expect(component.contentClass()).toBe("");
  });

  it("should have proper container structure", () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(".border");
    expect(container).toBeTruthy();
  });

  it("should handle both title and description together", () => {
    fixture.componentRef.setInput("title", "Test Title");
    fixture.componentRef.setInput("description", "Test Description");
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Title");
    expect(compiled.textContent).toContain("Test Description");
  });
});
