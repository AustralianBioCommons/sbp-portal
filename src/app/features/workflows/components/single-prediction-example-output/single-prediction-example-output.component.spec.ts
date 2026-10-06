import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SinglePredictionExampleOutputComponent } from "./single-prediction-example-output.component";

describe("SinglePredictionExampleOutputComponent", () => {
  let fixture: ComponentFixture<SinglePredictionExampleOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePredictionExampleOutputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionExampleOutputComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
