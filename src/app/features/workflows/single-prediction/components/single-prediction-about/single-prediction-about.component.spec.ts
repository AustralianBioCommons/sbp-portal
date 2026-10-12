import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SinglePredictionAboutComponent } from "./single-prediction-about.component";

type SinglePredictionAboutComponentApi = SinglePredictionAboutComponent & {
  activeToolParameterTab: {
    set: (tabId: string) => void;
  };
  activeToolParameters: () => {
    id: string;
    label: string;
    rows: readonly {
      input: string;
      description: string;
      formatAndLimits: readonly string[];
    }[];
  };
  selectToolParameterTab: (tabId: string) => void;
};

describe("SinglePredictionAboutComponent", () => {
  let fixture: ComponentFixture<SinglePredictionAboutComponent>;
  let component: SinglePredictionAboutComponentApi;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePredictionAboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionAboutComponent);
    component =
      fixture.componentInstance as unknown as SinglePredictionAboutComponentApi;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("switches tool-specific parameter tabs", () => {
    const element: HTMLElement = fixture.nativeElement;
    const boltzTab = Array.from(
      element.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    ).find((button) => button.textContent?.trim() === "Boltz");

    expect(element.textContent).toContain("Full BFD database");
    expect(boltzTab).toBeTruthy();

    boltzTab!.click();
    fixture.detectChanges();

    expect(boltzTab!.getAttribute("aria-selected")).toBe("true");
    expect(element.textContent).toContain("Use Potentials");
    expect(element.textContent).toContain(
      "Steering potentials increase VRAM requirements"
    );
  });

  it("renders ColabFold tool-specific parameter rows", () => {
    component.selectToolParameterTab("colabfold");
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(component.activeToolParameters().label).toBe("ColabFold");
    expect(element.textContent).toContain("Recycles");
    expect(element.textContent).toContain("Minimum: 1");
    expect(element.textContent).toContain("Maximum: 10");
  });

  it("falls back to the first tool-specific tab if the active tab is unknown", () => {
    component.activeToolParameterTab.set("unknown");

    expect(component.activeToolParameters().id).toBe("alphafold2");
    expect(
      component.activeToolParameters().rows.map((row) => row.input)
    ).toEqual(["Random Seed", "Full DBs"]);
  });
});
