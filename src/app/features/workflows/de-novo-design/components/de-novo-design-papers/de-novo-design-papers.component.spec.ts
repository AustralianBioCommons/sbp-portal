import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DeNovoDesignPapersComponent } from "./de-novo-design-papers.component";

describe("DeNovoDesignPapersComponent", () => {
  let fixture: ComponentFixture<DeNovoDesignPapersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeNovoDesignPapersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignPapersComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
