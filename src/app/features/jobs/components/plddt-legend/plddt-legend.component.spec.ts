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
    expect(text).toContain("pLDDT ≤ 50");
  });

  it("selects one confidence band for a table and restores the full viewer legend", () => {
    fixture.componentRef.setInput("confidence", "High");
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll("li").length).toBe(1);
    expect(element.textContent).toContain("90 ≥ pLDDT > 70");
    expect(element.textContent).not.toContain("Very high");
    expect(element.textContent).not.toContain("Low");

    fixture.componentRef.setInput("confidence", undefined);
    fixture.detectChanges();

    expect(element.querySelectorAll("li").length).toBe(4);
  });
});
