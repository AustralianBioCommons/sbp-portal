import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { InteractionScreeningAboutComponent } from "./interaction-screening-about.component";

describe("InteractionScreeningAboutComponent", () => {
  let fixture: ComponentFixture<InteractionScreeningAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractionScreeningAboutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionScreeningAboutComponent);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
