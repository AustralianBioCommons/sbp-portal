import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { BulkPredictionAboutComponent } from "./bulk-prediction-about.component";

describe("BulkPredictionAboutComponent", () => {
  let fixture: ComponentFixture<BulkPredictionAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkPredictionAboutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkPredictionAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("renders the updated pipeline, credits, and input configuration content", () => {
    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent ?? "";

    expect(text).toContain("This workflow enables the structure prediction");
    expect(text).toContain("Multiple Sequence Alignment (MSA) generation");
    expect(text).toContain("MMSeqs2-based colabfold_search process");
    expect(text).toContain("15 x 3 = 45 credits");
    expect(text).toContain("Protein Sequences");
    expect(text).toContain("Minimum: 10 sequences.");
    expect(element.querySelectorAll("app-citation-link").length).toBe(4);
    const singlePredictionLinks = Array.from(element.querySelectorAll("a"))
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) =>
        href.includes("/structure-prediction/single-prediction")
      );
    expect(singlePredictionLinks.length).toBe(3);
  });
});
