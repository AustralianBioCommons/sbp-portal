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
});
