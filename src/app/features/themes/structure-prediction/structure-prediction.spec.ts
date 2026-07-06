import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, RouterLink } from "@angular/router";
import { By } from "@angular/platform-browser";
import { StructurePredictionComponent } from "./structure-prediction";

describe("StructurePredictionComponent", () => {
  let component: StructurePredictionComponent;
  let fixture: ComponentFixture<StructurePredictionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StructurePredictionComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StructurePredictionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should define workflows", () => {
    expect(component.workflows.length).toBe(3);
    expect(component.workflows[0]).toEqual({
      id: "single-prediction",
      label: "Single Prediction",
      href: "/structure-prediction/single-prediction",
    });
    expect(component.workflows[1]).toEqual({
      id: "bulk-prediction",
      label: "Bulk Prediction",
      href: "/structure-prediction/bulk-prediction",
    });
    expect(component.workflows[2]).toEqual({
      id: "interaction-screening",
      label: "Interaction Screening",
      href: "/structure-prediction/interaction-screening",
    });
  });

  it("should define tools", () => {
    expect(component.tools.length).toBe(3);
    expect(component.tools[0]).toEqual({
      id: "boltz",
      label: "Boltz",
      href: "/structure-prediction/single-prediction",
    });
    expect(component.tools[1]).toEqual({
      id: "colabfold",
      label: "ColabFold",
      href: "/structure-prediction/single-prediction",
    });
    expect(component.tools[2]).toEqual({
      id: "alphafold2",
      label: "AlphaFold2",
      href: "/structure-prediction/single-prediction",
    });
  });

  it("should render enabled workflows and tools as routerLink anchors", () => {
    const linkTexts = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((link) => link.nativeElement.textContent.trim());

    [
      "Single Prediction",
      "Bulk Prediction",
      "Interaction Screening",
      "Boltz",
      "ColabFold",
      "AlphaFold2",
    ].forEach((label) => expect(linkTexts).toContain(label));
  });
});
