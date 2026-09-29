import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { LocationStrategy } from "@angular/common";
import { MockLocationStrategy } from "@angular/common/testing";
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  UrlTree,
} from "@angular/router";
import { of, Subject } from "rxjs";
import { AuthService } from "../../core/services/auth.service";

import { Navbar, NavItem } from "./navbar.component";

describe("Navbar", () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let routerEventsSubject: Subject<NavigationEnd>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj("AuthService", ["login", "logout"], {
      isAuthenticated$: of(false),
      user$: of(null),
      error$: of(null),
    });

    routerEventsSubject = new Subject();
    mockRouter = jasmine.createSpyObj(
      "Router",
      ["createUrlTree", "serializeUrl"],
      {
        url: "/themes",
        events: routerEventsSubject.asObservable(),
      }
    );
    // RouterLink computes anchor hrefs via these Router APIs.
    mockRouter.createUrlTree.and.returnValue({} as UrlTree);
    mockRouter.serializeUrl.and.returnValue("/");

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        // RouterLink also injects ActivatedRoute + LocationStrategy.
        { provide: ActivatedRoute, useValue: {} },
        { provide: LocationStrategy, useClass: MockLocationStrategy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("router events", () => {
    it("should update breadcrumb state on NavigationEnd events", () => {
      const url = "/binder-design/de-novo-design";

      routerEventsSubject.next(new NavigationEnd(1, url, url));

      expect(component.showBreadcrumb()).toBe(true);
      expect(component.breadcrumb()?.workflowLabel).toBe("De Novo Design");
    });

    it("should ignore non-NavigationEnd router events", () => {
      routerEventsSubject.next({} as NavigationEnd);

      expect(component.showBreadcrumb()).toBe(false);
    });
  });

  describe("breadcrumb behaviour", () => {
    it("should show breadcrumb for a known workflow route", () => {
      component["checkRoute"]("/binder-design/de-novo-design");

      expect(component.showBreadcrumb()).toBe(true);
      expect(component.breadcrumb()).toEqual({
        themeLabel: "Binder Design",
        themeTab: "binder-design",
        workflowLabel: "De Novo Design",
      });
    });

    it("should show correct breadcrumb for single-prediction route", () => {
      component["checkRoute"]("/structure-prediction/single-prediction");

      expect(component.showBreadcrumb()).toBe(true);
      expect(component.breadcrumb()).toEqual({
        themeLabel: "Structure Prediction",
        themeTab: "structure-prediction",
        workflowLabel: "Single Prediction",
      });
    });

    it("should not show breadcrumb for /themes route", () => {
      component["checkRoute"]("/themes");

      expect(component.showBreadcrumb()).toBe(false);
      expect(component.breadcrumb()).toBeNull();
    });

    it("should not show breadcrumb for unknown routes", () => {
      component["checkRoute"]("/unknown-path");

      expect(component.showBreadcrumb()).toBe(false);
      expect(component.breadcrumb()).toBeNull();
    });

    it("should clear breadcrumb when navigating back to a home route", () => {
      component["checkRoute"]("/binder-design/de-novo-design");
      expect(component.showBreadcrumb()).toBe(true);

      component["checkRoute"]("/binder-design");
      expect(component.showBreadcrumb()).toBe(false);
      expect(component.breadcrumb()).toBeNull();
    });

    it("should strip query params when matching workflow routes", () => {
      component["checkRoute"]("/binder-design/de-novo-design?foo=bar");

      expect(component.showBreadcrumb()).toBe(true);
    });
  });

  describe("isNavItemActive", () => {
    beforeEach(() => {
      component.currentRoute.set("/themes");
    });

    it("should return false when current route does not match item path", () => {
      const item: NavItem = { label: "My Jobs", path: "/my-jobs" };
      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return true when current route matches item path", () => {
      const item: NavItem = { label: "Themes", path: "/themes" };
      expect(component.isNavItemActive(item)).toBe(true);
    });
  });

  describe("login and logout", () => {
    it("should call auth.login with current router url", () => {
      component.login();
      expect(mockAuthService.login).toHaveBeenCalledWith(mockRouter.url);
    });

    it("should call auth.logout", () => {
      component.logout();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe("toggleMobileMenu", () => {
    it("should toggle mobile menu open state", () => {
      expect(component.isMobileMenuOpen()).toBe(false);
      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen()).toBe(true);
      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should close the mobile menu when Escape is pressed", () => {
      component.isMobileMenuOpen.set(true);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should move focus into the panel on open and back to the menu button on close", async () => {
      const el: HTMLElement = fixture.nativeElement;
      const panel = el.querySelector<HTMLElement>(".compact-menu")!;
      expect(panel.inert).toBeTrue();

      component.toggleMobileMenu();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel.inert).toBeFalse();
      expect(document.activeElement).toBe(
        el.querySelector('[aria-label="Close menu"]')
      );

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      fixture.detectChanges();

      expect(panel.inert).toBeTrue();
      expect(document.activeElement).toBe(
        el.querySelector('[aria-label="Open menu"]')
      );
    });
  });

  describe("navItems", () => {
    it("should link each theme group to its landing page and list only enabled workflows", () => {
      const [binderDesign, structurePrediction] = component.navItems;

      expect(binderDesign.path).toBe("/binder-design");
      expect(structurePrediction.path).toBe("/structure-prediction");
      expect(binderDesign.children?.map((child) => child.label)).toEqual([
        "De Novo Design",
      ]);
    });

    it("should keep menu-only items out of the desktop links", () => {
      expect(component.desktopNavItems.map((item) => item.label)).toEqual([
        "Binder Design",
        "Structure Prediction",
        "My Jobs",
      ]);
    });
  });

  describe("openProfile", () => {
    it("should open the profile URL in a new tab", () => {
      spyOn(window, "open");
      component.openProfile();
      expect(window.open).toHaveBeenCalledWith(
        jasmine.any(String),
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
});
