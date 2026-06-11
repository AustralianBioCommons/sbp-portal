import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { of } from "rxjs";

import NotFoundComponent from "./not-found";

describe("NotFoundComponent", () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj(
      "Router",
      ["navigate", "createUrlTree", "serializeUrl"],
      {
        events: of({}),
      }
    );
    routerSpy.createUrlTree.and.returnValue({});
    routerSpy.serializeUrl.and.returnValue("/test-url");
    const activatedRouteMock = {
      params: of({}),
      queryParams: of({}),
      fragment: of(null),
      data: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display 404 error number", () => {
    const errorNumber = fixture.debugElement.query(By.css(".text-8xl"));
    expect(errorNumber.nativeElement.textContent.trim()).toBe("404");
  });

  it('should display "Page Not Found" subtitle', () => {
    const errorSubtitle = fixture.debugElement.query(By.css(".text-2xl"));
    expect(errorSubtitle.nativeElement.textContent.trim()).toBe(
      "Page Not Found"
    );
  });

  it("should display Australian BioCommons Portal title", () => {
    const brandTitle = fixture.debugElement.query(By.css("h1"));
    expect(brandTitle.nativeElement.textContent.trim()).toBe(
      "Australian BioCommons Portal"
    );
  });

  it("should have three suggestion cards", () => {
    const suggestionCards = fixture.debugElement.queryAll(
      By.css(".rounded-2xl")
    );
    expect(suggestionCards.length).toBe(3);
  });

  it("should call window.history.back when goBack is called", () => {
    spyOn(window.history, "back");

    component.goBack();

    expect(window.history.back).toHaveBeenCalled();
  });

  it("should link popular destinations via routerLink", () => {
    const linkTexts = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((link) => link.nativeElement.textContent.trim());

    expect(linkTexts).toContain("Binder Design");
    expect(linkTexts).toContain("Structure Prediction");
    expect(linkTexts).toContain("Single Structure Prediction");
  });

  it("should have support email link", () => {
    const supportLink = fixture.debugElement.query(
      By.css("a[href='mailto:support@biocommons.org.au']")
    );
    expect(supportLink.nativeElement.getAttribute("href")).toBe(
      "mailto:support@biocommons.org.au"
    );
  });

  it("should trigger goBack when the back button is clicked", () => {
    spyOn(component, "goBack");

    const backButton = fixture.debugElement.query(
      By.css("app-button[variant='primary'] button")
    );
    backButton.nativeElement.click();

    expect(component.goBack).toHaveBeenCalled();
  });
});
