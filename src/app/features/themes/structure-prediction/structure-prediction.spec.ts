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
    expect(component.workflows.map((w) => w.id)).toEqual([
      "single-prediction",
      "bulk-prediction",
      "interaction-screening",
    ]);
  });

  it("should map tools onto each workflow", () => {
    const toolIds = (id: string) =>
      component.workflows.find((w) => w.id === id)?.tools.map((t) => t.id);

    expect(toolIds("single-prediction")).toEqual([
      "colabfold",
      "alphafold2",
      "boltz",
    ]);
    expect(toolIds("bulk-prediction")).toEqual(["boltz", "colabfold"]);
    expect(toolIds("interaction-screening")).toEqual(["boltz", "colabfold"]);
  });

  it("should render an enabled card linking to each workflow", () => {
    const hrefs = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((link) => link.nativeElement.getAttribute("href"));

    [
      "/structure-prediction/single-prediction",
      "/structure-prediction/bulk-prediction",
      "/structure-prediction/interaction-screening",
    ].forEach((href) => expect(hrefs).toContain(href));
  });

  it("should render workflow tools as badges", () => {
    const badgeTexts = fixture.debugElement
      .queryAll(By.css("li span"))
      .map((el) => el.nativeElement.textContent.trim());

    ["Boltz", "ColabFold", "AlphaFold2"].forEach((label) =>
      expect(badgeTexts).toContain(label)
    );
  });
});
