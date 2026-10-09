import { ComponentFixture, TestBed } from "@angular/core/testing";
import { WorkflowPapersComponent } from "./workflow-papers.component";

describe("WorkflowPapersComponent", () => {
  let fixture: ComponentFixture<WorkflowPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowPapersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowPapersComponent);
    fixture.componentRef.setInput("workflowName", "Bulk Prediction");
    fixture.componentRef.setInput("tools", ["boltz", "colabfold"]);
    fixture.detectChanges();
  });

  it("uses relevant workflow and tool citations by default", () => {
    const element: HTMLElement = fixture.nativeElement;
    const headings = Array.from(element.querySelectorAll("h3")).map((h) =>
      h.textContent?.trim()
    );

    expect(headings).toEqual(["Boltz-2", "ColabFold"]);
    expect(element.textContent).toContain(
      "Passaro, S., Corso, G., Wohlwend, J. et al. Boltz-2: Towards Accurate and Efficient Binding Affinity Prediction."
    );
  });

  it("uses explicit citation keys when provided", () => {
    fixture.componentRef.setInput("citations", ["proteindj", "rfdiffusion"]);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const headings = Array.from(element.querySelectorAll("h3")).map((h) =>
      h.textContent?.trim()
    );

    expect(headings).toEqual(["ProteinDJ", "RFdiffusion"]);
    expect(element.textContent).toContain(
      "Silke, D., Iskander, J., Pan, J., Thompson, A.P., Papenfuss, A.T., Lucet, I.S., Hardy, J.M. ProteinDJ: a high-performance and modular protein design pipeline. Prot Sci (2026)."
    );
  });
});
