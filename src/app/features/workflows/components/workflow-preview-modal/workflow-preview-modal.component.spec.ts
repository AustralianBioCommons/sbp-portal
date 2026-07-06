import { ComponentFixture, TestBed } from "@angular/core/testing";
import { WorkflowPreviewModalComponent } from "./workflow-preview-modal.component";

describe("WorkflowPreviewModalComponent", () => {
  let component: WorkflowPreviewModalComponent;
  let fixture: ComponentFixture<WorkflowPreviewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowPreviewModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowPreviewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.componentRef.setInput("isOpen", false);
    fixture.detectChanges();
    fixture.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should default the title to 'Workflow Preview'", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector(
      "#workflow-preview-title"
    );
    expect(heading?.textContent?.trim()).toBe("Workflow Preview");
  });

  it("should label the submit button with the credit cost", () => {
    fixture.componentRef.setInput("credits", 5);
    expect(component.confirmLabel()).toBe("Use 5 credits and submit");

    fixture.componentRef.setInput("credits", 1);
    expect(component.confirmLabel()).toBe("Use 1 credit and submit");
  });

  it("should fall back to 'Submit' when credits are unknown", () => {
    fixture.componentRef.setInput("credits", null);
    expect(component.confirmLabel()).toBe("Submit");
  });

  it("should emit confirmed when the submit action is invoked", () => {
    spyOn(component.confirmed, "emit");
    component.onConfirm();
    expect(component.confirmed.emit).toHaveBeenCalled();
  });

  it("should emit cancelled when dismissed", () => {
    spyOn(component.cancelled, "emit");
    component.onCancel();
    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it("should render the configuration summary from its inputs", () => {
    fixture.componentRef.setInput("isOpen", true);
    fixture.componentRef.setInput("workflowName", "De Novo Design");
    fixture.componentRef.setInput("selectedTool", "BindCraft");
    fixture.componentRef.setInput("inputItems", [
      { label: "Job Name", value: "my-job", fieldName: "id" },
    ]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("De Novo Design");
    expect(text).toContain("BindCraft");
    expect(text).toContain("my-job");
  });
});
