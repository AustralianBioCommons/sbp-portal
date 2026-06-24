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
import { AuthService } from "../../cores/auth.service";

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
      ["navigate", "parseUrl", "createUrlTree", "serializeUrl"],
      {
        url: "/themes",
        events: routerEventsSubject.asObservable(),
      }
    );
    mockRouter.parseUrl.and.returnValue({
      queryParams: {},
      fragment: null,
    } as unknown as UrlTree);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
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

  describe("shouldShowNavItem", () => {
    it("should show items that do not require auth", () => {
      const item: NavItem = { label: "Public", requiresAuth: false };
      expect(component.shouldShowNavItem(item, false)).toBe(true);
      expect(component.shouldShowNavItem(item, true)).toBe(true);
    });

    it("should hide auth-required items when not authenticated", () => {
      const item: NavItem = { label: "Private", requiresAuth: true };
      expect(component.shouldShowNavItem(item, false)).toBe(false);
    });

    it("should show auth-required items when authenticated", () => {
      const item: NavItem = { label: "Private", requiresAuth: true };
      expect(component.shouldShowNavItem(item, true)).toBe(true);
    });

    it("should show items with no requiresAuth defined", () => {
      const item: NavItem = { label: "Default" };
      expect(component.shouldShowNavItem(item, false)).toBe(true);
    });
  });

  describe("isNavItemActive", () => {
    beforeEach(() => {
      component.currentRoute.set("/themes");
    });

    it("should return false when item has no path", () => {
      const item: NavItem = { label: "No path" };
      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return false when current route does not match item path", () => {
      const item: NavItem = { label: "Jobs", path: "/jobs" };
      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return true when path matches and no queryParams required", () => {
      const item: NavItem = { label: "Themes", path: "/themes" };
      mockRouter.parseUrl.and.returnValue({
        queryParams: {},
        fragment: null,
      } as unknown as UrlTree);
      expect(component.isNavItemActive(item)).toBe(true);
    });

    it("should return false when path matches but query param does not", () => {
      const item: NavItem = {
        label: "Structure Prediction",
        path: "/themes",
        queryParams: { tab: "structure-prediction" },
      };
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "binder-design" },
        fragment: null,
      } as unknown as UrlTree);
      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return true when path and all query params match", () => {
      const item: NavItem = {
        label: "Binder Design",
        path: "/themes",
        queryParams: { tab: "binder-design" },
      };
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "binder-design" },
        fragment: null,
      } as unknown as UrlTree);
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
  });

  describe("navigate", () => {
    it("should navigate with queryParams and close mobile menu", async () => {
      component.isMobileMenuOpen.set(true);
      component.navigate("/jobs", { filter: "active" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/jobs"], {
        queryParams: { filter: "active" },
      });
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should navigate without queryParams and close mobile menu", async () => {
      component.isMobileMenuOpen.set(true);
      component.navigate("/about");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/about"]);
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should close mobile menu even when navigation rejects", async () => {
      spyOn(console, "error");
      mockRouter.navigate.and.returnValue(
        Promise.reject(new Error("nav error"))
      );
      component.isMobileMenuOpen.set(true);
      component.navigate("/about");
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should close mobile menu when queryParam navigation rejects", async () => {
      spyOn(console, "error");
      mockRouter.navigate.and.returnValue(
        Promise.reject(new Error("nav error"))
      );
      component.isMobileMenuOpen.set(true);

      component.navigate("/jobs", { filter: "active" });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/jobs"], {
        queryParams: { filter: "active" },
      });
      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });

  describe("executeAction", () => {
    it("should call the provided action and close mobile menu", () => {
      const action = jasmine.createSpy("action");
      component.isMobileMenuOpen.set(true);

      component.executeAction(action);

      expect(action).toHaveBeenCalled();
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should close mobile menu even when no action is provided", () => {
      component.isMobileMenuOpen.set(true);

      component.executeAction(undefined);

      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });

  describe("isParentNavItemActive", () => {
    beforeEach(() => {
      component.currentRoute.set("/themes");
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "binder-design" },
        fragment: null,
      } as unknown as UrlTree);
    });

    it("should delegate to isNavItemActive when item has no children", () => {
      const item: NavItem = { label: "Jobs", path: "/jobs" };
      expect(component.isParentNavItemActive(item)).toBe(false);
    });

    it("should return true when any child is active", () => {
      const item: NavItem = {
        label: "Home",
        children: [
          {
            label: "Binder Design",
            path: "/themes",
            queryParams: { tab: "binder-design" },
          },
          {
            label: "Structure Prediction",
            path: "/themes",
            queryParams: { tab: "structure-prediction" },
          },
        ],
      };
      expect(component.isParentNavItemActive(item)).toBe(true);
    });

    it("should return false when no child is active", () => {
      component.currentRoute.set("/jobs");
      const item: NavItem = {
        label: "Home",
        children: [
          {
            label: "Binder Design",
            path: "/themes",
            queryParams: { tab: "binder-design" },
          },
        ],
      };
      expect(component.isParentNavItemActive(item)).toBe(false);
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
