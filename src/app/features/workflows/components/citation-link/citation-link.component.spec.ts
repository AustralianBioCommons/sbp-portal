import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CitationLinkComponent } from "./citation-link.component";

describe("CitationLinkComponent", () => {
  let fixture: ComponentFixture<CitationLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationLinkComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CitationLinkComponent);
  });

  it("renders a citation link as first author and year", () => {
    fixture.componentRef.setInput("citationKey", "alphafold2");
    fixture.detectChanges();

    const link: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector("a");

    expect(link?.textContent).toContain("Jumper, 2021");
    expect(link?.href).toBe("https://doi.org/10.1038/s41586-021-03819-2");
  });

  it("renders the citation key as plain text when no citation is found", () => {
    fixture.componentRef.setInput("citationKey", "unknown-citation");
    fixture.detectChanges();

    const link: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector("a");
    const fallback: HTMLSpanElement | null =
      fixture.nativeElement.querySelector("span");

    expect(link).toBeNull();
    expect(fallback?.textContent).toBe("unknown-citation");
    expect(
      (fixture.componentInstance as unknown as { href: () => string }).href()
    ).toBe("");
  });
});
