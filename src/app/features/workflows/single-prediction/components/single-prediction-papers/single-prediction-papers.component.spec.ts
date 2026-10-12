import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SinglePredictionPapersComponent } from "./single-prediction-papers.component";

describe("SinglePredictionPapersComponent", () => {
  let fixture: ComponentFixture<SinglePredictionPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePredictionPapersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SinglePredictionPapersComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
