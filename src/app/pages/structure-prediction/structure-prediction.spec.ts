import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { StructurePredictionComponent } from "./structure-prediction";

describe("StructurePredictionComponent", () => {
  let component: StructurePredictionComponent;
  let fixture: ComponentFixture<StructurePredictionComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj("Router", ["navigate"]);

    await TestBed.configureTestingModule({
      imports: [StructurePredictionComponent],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).compileComponents();

    fixture = TestBed.createComponent(StructurePredictionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should define workflows", () => {
    expect(component.workflows.length).toBe(2);
    expect(component.workflows[0]).toEqual({
      id: "single-structure-prediction",
      label: "Single Prediction",
      href: "/single-structure-prediction",
      disabled: true,
    });
    expect(component.workflows[1]).toEqual({
      id: "interaction-screening",
      label: "Interaction Screening",
      href: "/interaction-screening",
      disabled: true,
    });
  });

  it("should define tools", () => {
    expect(component.tools.length).toBe(3);
    expect(component.tools[0]).toEqual({
      id: "boltz",
      label: "Boltz",
      href: "/tools/boltz",
      disabled: true,
    });
    expect(component.tools[1]).toEqual({
      id: "colabfold",
      label: "ColabFold",
      href: "/tools/colabfold",
      disabled: true,
    });
    expect(component.tools[2]).toEqual({
      id: "alphafold2",
      label: "AlphaFold2",
      href: "/tools/alphafold2",
      disabled: true,
    });
  });

  it("should not navigate to workflow when disabled", () => {
    component.navigateToWorkflow("single-structure-prediction");
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("should navigate to workflow when enabled", () => {
    component.workflows[0].disabled = false;
    component.navigateToWorkflow("single-structure-prediction");
    expect(mockRouter.navigate).toHaveBeenCalledWith([
      "/single-structure-prediction",
    ]);
  });

  it("should not navigate to workflow when id is unknown", () => {
    component.navigateToWorkflow("unknown-workflow");
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("should not navigate to tool when disabled", () => {
    component.navigateToTool("boltz");
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("should navigate to tool when enabled", () => {
    component.tools[0].disabled = false;
    component.navigateToTool("boltz");
    expect(mockRouter.navigate).toHaveBeenCalledWith(["/tools", "boltz"]);
  });

  it("should not navigate to tool when id is unknown", () => {
    component.navigateToTool("unknown-tool");
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
