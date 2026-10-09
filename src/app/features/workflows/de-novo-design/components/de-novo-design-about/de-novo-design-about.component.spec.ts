import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DeNovoDesignAboutComponent } from "./de-novo-design-about.component";

describe("DeNovoDesignAboutComponent", () => {
  let fixture: ComponentFixture<DeNovoDesignAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeNovoDesignAboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
