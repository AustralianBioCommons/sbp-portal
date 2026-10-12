import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DeNovoDesignPapersComponent } from "./de-novo-design-papers.component";

describe("DeNovoDesignPapersComponent", () => {
  let fixture: ComponentFixture<DeNovoDesignPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeNovoDesignPapersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignPapersComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("renders the De Novo Design paper list", () => {
    const headings = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll("h3")
    ).map((heading) => heading.textContent?.trim());

    expect(headings).toEqual([
      "ProteinDJ",
      "RFdiffusion",
      "BindCraft",
      "ProteinMPNN",
      "SolubleMPNN",
      "OpenMM",
      "AlphaFold2",
      "AlphaFold2 Initial Guess and ProteinMPNN-FastRelax",
    ]);
  });
});
