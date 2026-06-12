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

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? "";
  }

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("is not insufficient when the total is unknown", () => {
    component.total = null;
    component.remaining = 250;
    expect(component.insufficient).toBe(false);
  });

  it("is not insufficient when the remaining balance is unknown", () => {
    component.total = 100;
    component.remaining = null;
    expect(component.insufficient).toBe(false);
  });

  it("is not insufficient when the total fits within the balance", () => {
    component.total = 100;
    component.remaining = 250;
    fixture.detectChanges();

    expect(component.insufficient).toBe(false);
    expect(text()).toContain("100 Credits");
    expect(text()).not.toContain("Insufficient");
  });

  it("is insufficient and warns when the total exceeds the balance", () => {
    component.total = 300;
    component.remaining = 250;
    component.reduceHint = "reduce the number of designs";
    fixture.detectChanges();

    expect(component.insufficient).toBe(true);
    expect(text()).toContain("Insufficient credits");
    expect(text()).toContain("250 credits available");
    expect(text()).toContain("reduce the number of designs");
  });

  it("renders an em dash when the total is unknown", () => {
    component.total = null;
    fixture.detectChanges();
    expect(text()).toContain("—");
  });
});
