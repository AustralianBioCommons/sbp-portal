import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import NotFoundComponent from "./not-found";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, Router, RouterLink } from "@angular/router";

describe("NotFoundComponent", () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display 404 error code", () => {
    const errorCode = fixture.debugElement.query(By.css("p.text-sky-500"));
    expect(errorCode.nativeElement.textContent.trim()).toBe("404");
  });

  it('should display "Page not found" heading', () => {
    const heading = fixture.debugElement.query(By.css("h1"));
    expect(heading.nativeElement.textContent.trim()).toBe("Page not found");
  });

  it("should display error message", () => {
    const message = fixture.debugElement.query(By.css("p.text-gray-500"));
    expect(message.nativeElement.textContent.trim()).toBe(
      "Sorry, we couldn't find the page you're looking for."
    );
  });

  it('should have "Go back" button with home route', () => {
    const button = fixture.debugElement.query(By.css("app-button"));
    expect(button).toBeTruthy();
    expect(button.nativeElement.textContent.trim()).toBe("Go back");

    const router = TestBed.inject(Router);
    const routerLink = button.injector.get(RouterLink);
    expect(router.serializeUrl(routerLink.urlTree!)).toBe("/");
  });
});
