import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PredictionConfidenceScoresComponent } from "./prediction-confidence-scores.component";

describe("PredictionConfidenceScoresComponent", () => {
  let fixture: ComponentFixture<PredictionConfidenceScoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionConfidenceScoresComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PredictionConfidenceScoresComponent);
  });

  it("updates the displayed scores and their shared tooltip together", () => {
    fixture.componentRef.setInput("scores", [
      { label: "ipTM", value: "0.91", hint: "Interface confidence" },
      { label: "pTM", value: "0.88", hint: "Overall confidence" },
    ]);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const labels = () =>
      Array.from(element.querySelectorAll("span")).map((span) =>
        span.textContent?.trim()
      );

    expect(labels()).toEqual(["ipTM = 0.91", "pTM = 0.88"]);
    expect(fixture.componentInstance.scoresHint()).toBe(
      "ipTM: Interface confidence\n\npTM: Overall confidence"
    );

    fixture.componentRef.setInput("scores", [
      { label: "pTM", value: "0.75", hint: "Overall confidence" },
    ]);
    fixture.detectChanges();

    expect(labels()).toEqual(["pTM = 0.75"]);
    expect(fixture.componentInstance.scoresHint()).toBe(
      "pTM: Overall confidence"
    );
  });

  it("shows the tooltip by default and can hide it while retaining the scores", () => {
    fixture.componentRef.setInput("scores", [
      { label: "ipTM", value: "0.91", hint: "Interface confidence" },
      { label: "pTM", value: "0.88", hint: "Overall confidence" },
    ]);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector("app-tooltip")).not.toBeNull();

    fixture.componentRef.setInput("showTooltip", false);
    fixture.detectChanges();

    expect(element.querySelector("app-tooltip")).toBeNull();
    expect(element.textContent).toContain("ipTM = 0.91");
    expect(element.textContent).toContain("pTM = 0.88");
  });
});
