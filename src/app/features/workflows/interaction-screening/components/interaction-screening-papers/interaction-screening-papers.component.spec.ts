import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InteractionScreeningPapersComponent } from "./interaction-screening-papers.component";

describe("InteractionScreeningPapersComponent", () => {
  let fixture: ComponentFixture<InteractionScreeningPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractionScreeningPapersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionScreeningPapersComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("renders the Interaction Screening paper list", () => {
    const headings = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll("h3")
    ).map((heading) => heading.textContent?.trim());

    expect(headings).toEqual([
      "AlphaFold2",
      "AlphaFold-Multimer",
      "ColabFold",
      "Boltz-2",
      "MMseqs2",
      "Structural Biology AI Reference Collection",
    ]);
  });
});
