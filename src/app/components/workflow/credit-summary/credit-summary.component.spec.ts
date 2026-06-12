import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CreditSummaryComponent } from "./credit-summary.component";

describe("CreditSummaryComponent", () => {
  let component: CreditSummaryComponent;
  let fixture: ComponentFixture<CreditSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditSummaryComponent);
    component = fixture.componentInstance;
  });

  function setInputs(total: number | null, remaining: number | null): void {
    fixture.componentRef.setInput("total", total);
    fixture.componentRef.setInput("remaining", remaining);
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? "";
  }

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("is not insufficient when the total is unknown", () => {
    setInputs(null, 250);
    expect(component.insufficient()).toBe(false);
  });

  it("is not insufficient when the remaining balance is unknown", () => {
    setInputs(100, null);
    expect(component.insufficient()).toBe(false);
  });

  it("is not insufficient when the total fits within the balance", () => {
    setInputs(100, 250);

    expect(component.insufficient()).toBe(false);
    expect(text()).toContain("100 Credits");
    expect(text()).not.toContain("insufficient");
  });

  it("is insufficient and warns when the total exceeds the balance", () => {
    setInputs(300, 250);

    expect(component.insufficient()).toBe(true);
    expect(text()).toContain(
      "You have insufficient SBP credits to execute this workflow"
    );
    expect(text()).toContain("credit allocation is reset");
  });

  it("renders an em dash when the total is unknown", () => {
    setInputs(null, 0);
    expect(text()).toContain("—");
  });
});
