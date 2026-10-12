import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DeNovoDesignAboutComponent } from "./de-novo-design-about.component";

describe("DeNovoDesignAboutComponent", () => {
  let fixture: ComponentFixture<DeNovoDesignAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeNovoDesignAboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("renders the updated pipeline, credits, and input configuration content", () => {
    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent ?? "";

    expect(text).toContain("de novo design of proteins able to bind");
    expect(text).toContain("The pipeline contains 4 modular steps");
    expect(text).toContain("SolubleMPNN");
    expect(text).toContain("8 x 100 sequences");
    expect(text).toContain("AlphaFold2 (Initial Guess)");
    expect(text).toContain("Tool multiplier x (Number of Designs)");
    expect(text).toContain("10 x 100 = 1000 credits");
    expect(text).toContain("Target Hotspot Residues");
    expect(text).toContain("Length range between 65 and 150 amino acids.");
    expect(element.querySelectorAll("app-citation-link").length).toBe(9);
  });
});
