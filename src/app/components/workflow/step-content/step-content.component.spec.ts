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
    component.title = "Test Step Title";
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Step Title");
  });

  it("should display description when provided", () => {
    component.description = "This is a test description";
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("This is a test description");
  });

  it("should not display title when not provided", () => {
    component.title = "";
    fixture.detectChanges();
    const titleElement = fixture.nativeElement.querySelector("h5");
    expect(titleElement).toBeFalsy();
  });

  it("should not display description when not provided", () => {
    component.description = "";
    fixture.detectChanges();
    const descriptionElement = fixture.nativeElement.querySelector("p");
    expect(descriptionElement).toBeFalsy();
  });

  it("should apply custom content class when provided", () => {
    component.contentClass = "custom-class";
    fixture.detectChanges();
    const contentDiv = fixture.nativeElement.querySelector(".custom-class");
    expect(contentDiv).toBeTruthy();
  });

  it("should have empty content class by default", () => {
    expect(component.contentClass).toBe("");
  });

  it("should have proper container structure", () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      ".border.border-gray-200.rounded-DEFAULT-10"
    );
    expect(container).toBeTruthy();
  });

  it("should handle both title and description together", () => {
    component.title = "Test Title";
    component.description = "Test Description";
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Title");
    expect(compiled.textContent).toContain("Test Description");
  });
});
