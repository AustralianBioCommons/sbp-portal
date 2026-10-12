import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SinglePredictionExampleOutputComponent } from "./single-prediction-example-output.component";

describe("SinglePredictionExampleOutputComponent", () => {
  let fixture: ComponentFixture<SinglePredictionExampleOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePredictionExampleOutputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionExampleOutputComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("keeps the text scores above the structure when its explanation is closed", async () => {
    const element: HTMLElement = fixture.nativeElement;
    const scores = element.querySelector<HTMLElement>("[exampleOutputBanner]")!;
    const structure = element.querySelector<HTMLImageElement>(
      'img[src$="sp-example-structure.png"]'
    )!;
    const explanation = element.querySelector(
      '[aria-label="Predicted 3D Structure explanation"]'
    )!;

    expect(scores.parentElement).toBe(structure.parentElement);
    expect(explanation.contains(scores)).toBe(false);
    expect(scores.textContent).toContain("ipTM = 0.91");
    expect(scores.textContent).toContain("pTM = 0.88");
    expect(scores.querySelector("app-tooltip")).toBeNull();
    expect(
      element.querySelector('img[src$="sp-example-iptm-ptm.png"]')
    ).toBeNull();

    element
      .querySelector<HTMLButtonElement>('[aria-label="Hide explanation"]')!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(explanation.hasAttribute("inert")).toBe(true);
    expect(scores.closest("[inert]")).toBeNull();
    expect(scores.isConnected).toBe(true);
  });
});
