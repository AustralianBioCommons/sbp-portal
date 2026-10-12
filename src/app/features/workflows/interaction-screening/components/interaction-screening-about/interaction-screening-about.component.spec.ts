import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { InteractionScreeningAboutComponent } from "./interaction-screening-about.component";

describe("InteractionScreeningAboutComponent", () => {
  let fixture: ComponentFixture<InteractionScreeningAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractionScreeningAboutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionScreeningAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("renders the updated pipeline, credits, and input configuration content", () => {
    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent ?? "";

    expect(text).toContain("many candidate interactions");
    expect(text).toContain("Multiple Sequence Alignment (MSA) generation");
    expect(text).toContain("MMSeqs2-based colabfold_search process");
    expect(text).toContain(
      "Tool multiplier x (Query sequences x Target sequences)"
    );
    expect(text).toContain("150 credits");
    expect(text).toContain("Query Sequences");
    expect(text).toContain("Target Sequences");
    expect(text).toContain("Minimum: 10 query–target pairs");
    expect(element.querySelectorAll("app-citation-link").length).toBe(4);

    const singlePredictionLinks = Array.from(element.querySelectorAll("a"))
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) =>
        href.includes("/structure-prediction/single-prediction")
      );
    expect(singlePredictionLinks.length).toBe(3);
  });
});
