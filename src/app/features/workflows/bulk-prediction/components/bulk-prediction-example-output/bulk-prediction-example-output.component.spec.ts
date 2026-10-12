import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { BulkPredictionExampleOutputComponent } from "./bulk-prediction-example-output.component";

describe("BulkPredictionExampleOutputComponent", () => {
  let fixture: ComponentFixture<BulkPredictionExampleOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkPredictionExampleOutputComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkPredictionExampleOutputComponent);
    fixture.detectChanges();
  });

  it("links to the single prediction example output tab", () => {
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector<HTMLAnchorElement>("a[routerLink]");

    expect(link?.getAttribute("href")).toBe(
      "/structure-prediction/single-prediction?tab=output"
    );
  });

  it("keeps example downloads disabled until files are available", () => {
    const element: HTMLElement = fixture.nativeElement;
    const buttons =
      element.querySelectorAll<HTMLButtonElement>("app-button button");

    expect(buttons.length).toBe(3);
    buttons.forEach((button) => expect(button.disabled).toBeTrue());
  });
});
