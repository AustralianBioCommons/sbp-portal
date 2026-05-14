import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { of } from "rxjs";

import { NotFoundComponent } from "./not-found";

describe("NotFoundComponent", () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj(
      "Router",
      ["navigate", "createUrlTree", "serializeUrl"],
      {
        events: of({}),
      },
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
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
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
      "Page Not Found",
    );
  });

  it("should display Australian BioCommons Portal title", () => {
    const brandTitle = fixture.debugElement.query(By.css("h1"));
    expect(brandTitle.nativeElement.textContent.trim()).toBe(
      "Australian BioCommons Portal",
    );
  });

  it("should have three suggestion cards", () => {
    const suggestionCards = fixture.debugElement.queryAll(
      By.css(".rounded-2xl"),
    );
    expect(suggestionCards.length).toBe(3);
  });

  it("should navigate to themes when goHome is called", () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    component.goHome();

    expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"]);
  });

  it("should navigate to themes with search params when searchResources is called", () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    component.searchResources();

    expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
      queryParams: { search: "true" },
    });
  });

  it("should call window.history.back when goBack is called", () => {
    spyOn(window.history, "back");

    component.goBack();

    expect(window.history.back).toHaveBeenCalled();
  });

  it("should have three popular links", () => {
    const popularLinks = fixture.debugElement.queryAll(
      By.css("app-button[variant='secondary']"),
    );
    expect(popularLinks.length).toBe(3);

    const expectedTexts = [
      "Binder Design",
      "Structure Prediction",
      "Single Structure Prediction",
    ];

    popularLinks.forEach((link, index) => {
      expect(link.nativeElement.textContent.trim()).toBe(expectedTexts[index]);
    });
  });

  it("should have support email link", () => {
    const supportLink = fixture.debugElement.query(
      By.css("a[href='mailto:support@biocommons.org.au']"),
    );
    expect(supportLink.nativeElement.getAttribute("href")).toBe(
      "mailto:support@biocommons.org.au",
    );
  });

  it("should trigger goHome when home button is clicked", () => {
    spyOn(component, "goHome");

    const homeButton = fixture.debugElement.query(
      By.css("app-button[variant='primary'] button"),
    );
    homeButton.nativeElement.click();

    expect(component.goHome).toHaveBeenCalled();
  });

  it("should trigger goBack when back button is clicked", () => {
    spyOn(component, "goBack");

    const backButtons = fixture.debugElement.queryAll(
      By.css("app-button[variant='primary'] button"),
    );
    backButtons[1].nativeElement.click(); // Second button is "Go back"

    expect(component.goBack).toHaveBeenCalled();
  });

  it("should trigger searchResources when search button is clicked", () => {
    spyOn(component, "searchResources");

    const searchButtons = fixture.debugElement.queryAll(
      By.css("app-button[variant='primary'] button"),
    );
    searchButtons[2].nativeElement.click(); // Third button is "Search portal"

    expect(component.searchResources).toHaveBeenCalled();
  });

  it("should navigate to binder design when navigateToBinderDesign is called", () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    component.navigateToBinderDesign();

    expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
      queryParams: { tab: "binder-design" },
    });
  });

  it("should navigate to structure prediction when navigateToStructurePrediction is called", () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    component.navigateToStructurePrediction();

    expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
      queryParams: { tab: "structure-prediction" },
    });
  });

  it("should navigate to single structure prediction when navigateToSingleStructurePrediction is called", () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    component.navigateToSingleStructurePrediction();

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      "/single-structure-prediction",
    ]);
  });

  it("should trigger navigation when popular links are clicked", () => {
    const popularLinks = fixture.debugElement.queryAll(
      By.css("app-button[variant='secondary'] button"),
    );

    spyOn(component, "navigateToBinderDesign");
    spyOn(component, "navigateToStructurePrediction");
    spyOn(component, "navigateToSingleStructurePrediction");

    popularLinks[0].nativeElement.click();
    expect(component.navigateToBinderDesign).toHaveBeenCalled();

    popularLinks[1].nativeElement.click();
    expect(component.navigateToStructurePrediction).toHaveBeenCalled();

    popularLinks[2].nativeElement.click();
    expect(component.navigateToSingleStructurePrediction).toHaveBeenCalled();
  });
});
