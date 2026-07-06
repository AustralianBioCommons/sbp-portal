import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ConfigurationSummaryComponent,
  SummaryItem,
} from "./configuration-summary.component";

describe("ConfigurationSummaryComponent", () => {
  let component: ConfigurationSummaryComponent;
  let fixture: ComponentFixture<ConfigurationSummaryComponent>;

  const mockInputItems: SummaryItem[] = [
    { label: "Tool Name", value: "Test Tool", fieldName: "toolName" },
    { label: "Input File", value: "test.txt", fieldName: "inputFile" },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigurationSummaryComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput("workflowName", "Test Workflow");
    fixture.componentRef.setInput("selectedTool", "Test Tool");
    fixture.componentRef.setInput("inputItems", mockInputItems);
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display selected tool", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Tool");
  });

  it("should display summary items", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Tool Name");
    expect(compiled.textContent).toContain("test.txt");
  });

  it("should not render a validation status (form is validated before preview)", () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain("Configuration Valid");
    expect(compiled.textContent).not.toContain("Configuration Incomplete");
  });

  it("should display parameter status correctly", () => {
    fixture.componentRef.setInput("hasParameters", true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Has Parameters");

    fixture.componentRef.setInput("hasParameters", false);
    fixture.detectChanges();
    expect(compiled.textContent).toContain("No Parameters");
  });

  it("should not render a 'Not provided' fallback for empty values", () => {
    fixture.componentRef.setInput("inputItems", [
      { label: "Optional Field", value: "", fieldName: "optional" },
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain("Not provided");
    expect(compiled.textContent).toContain("Optional Field");
  });

  it("should display workflow name and tool settings", () => {
    fixture.componentRef.setInput("toolSettingItems", [
      { label: "num_recycles", value: "3", fieldName: "num_recycles" },
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Workflow");
    expect(compiled.textContent).toContain("num_recycles");
  });
});
