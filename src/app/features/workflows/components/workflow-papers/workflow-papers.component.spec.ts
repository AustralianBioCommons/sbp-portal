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

  it("cites only the given tools, in order", () => {
    const element: HTMLElement = fixture.nativeElement;
    const headings = Array.from(element.querySelectorAll("h3")).map((h) =>
      h.textContent?.trim()
    );

    expect(element.textContent).toContain(
      "Tools included in Bulk Prediction can be cited as below:"
    );
    expect(headings).toEqual(["Boltz-2", "ColabFold"]);
  });
});
