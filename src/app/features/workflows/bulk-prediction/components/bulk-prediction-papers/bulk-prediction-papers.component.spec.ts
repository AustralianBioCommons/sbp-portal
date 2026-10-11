import { ComponentFixture, TestBed } from "@angular/core/testing";
import { BulkPredictionPapersComponent } from "./bulk-prediction-papers.component";

describe("BulkPredictionPapersComponent", () => {
  let fixture: ComponentFixture<BulkPredictionPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkPredictionPapersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkPredictionPapersComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("renders the Bulk Prediction paper list", () => {
    const headings = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll("h3")
    ).map((heading) => heading.textContent?.trim());

    expect(headings).toEqual([
      "AlphaFold2",
      "ColabFold",
      "Boltz-2",
      "MMseqs2",
      "Structural Biology AI Reference Collection",
    ]);
  });
});
