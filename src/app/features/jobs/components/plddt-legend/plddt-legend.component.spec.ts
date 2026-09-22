import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PlddtLegendComponent } from "./plddt-legend.component";

describe("PlddtLegendComponent", () => {
  let fixture: ComponentFixture<PlddtLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlddtLegendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlddtLegendComponent);
    fixture.detectChanges();
  });

  it("names every confidence band and its range", () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Very high");
    expect(text).toContain("pLDDT > 90");
    expect(text).toContain("Very low");
    expect(text).toContain("pLDDT < 50");
  });
});
