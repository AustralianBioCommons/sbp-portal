import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SinglePredictionAboutComponent } from "./single-prediction-about.component";

describe("SinglePredictionAboutComponent", () => {
  let fixture: ComponentFixture<SinglePredictionAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePredictionAboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("switches tool-specific parameter tabs", () => {
    const element: HTMLElement = fixture.nativeElement;
    const boltzTab = Array.from(
      element.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    ).find((button) => button.textContent?.trim() === "Boltz");

    expect(element.textContent).toContain("Full BFD database");
    expect(boltzTab).toBeTruthy();

    boltzTab!.click();
    fixture.detectChanges();

    expect(boltzTab!.getAttribute("aria-selected")).toBe("true");
    expect(element.textContent).toContain("Use Potentials");
    expect(element.textContent).toContain(
      "Steering potentials increase VRAM requirements"
    );
  });
});
