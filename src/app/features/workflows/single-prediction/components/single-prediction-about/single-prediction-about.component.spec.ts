import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SinglePredictionAboutComponent } from "./single-prediction-about.component";

describe("SinglePredictionAboutComponent", () => {
  let fixture: ComponentFixture<SinglePredictionAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePredictionAboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
