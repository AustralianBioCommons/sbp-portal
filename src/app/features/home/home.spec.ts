import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import HomeComponent from "./home";

describe("HomeComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    });
  });

  it("should focus the heading when the home page opens", async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(document.activeElement).toBe(el.querySelector("h1"));
  });
});
