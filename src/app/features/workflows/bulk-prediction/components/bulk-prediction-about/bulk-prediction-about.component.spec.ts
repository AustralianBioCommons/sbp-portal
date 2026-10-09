import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { BulkPredictionAboutComponent } from "./bulk-prediction-about.component";

describe("BulkPredictionAboutComponent", () => {
  let fixture: ComponentFixture<BulkPredictionAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkPredictionAboutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkPredictionAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
