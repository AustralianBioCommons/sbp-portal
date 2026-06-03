import { ElementRef } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NavigationEnd, Router, UrlTree } from "@angular/router";
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
    mockRouter = jasmine.createSpyObj("Router", ["navigate", "parseUrl"], {
      url: "/themes",
      events: routerEventsSubject.asObservable(),
    });
    mockRouter.parseUrl.and.returnValue({
      queryParams: {},
      fragment: null,
    } as unknown as UrlTree);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("initialization", () => {
    it("should initialize with default values", async () => {
      // Wait for setTimeout in constructor to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(component.activeTab()).toBe("binder-design");
      expect(component.showTabs()).toBe(true); // Since mockRouter.url is '/themes'
    });

    it("should have correct tabs configuration", () => {
      expect(component.tabs.length).toBe(2);
      expect(component.tabs[0]).toEqual({
        id: "binder-design",
        label: "Binder Design",
        description: "Design and optimize protein binders for specific targets",
      });
      expect(component.tabs[1]).toEqual({
        id: "structure-prediction",
        label: "Structure Prediction",
        description: "Predict protein structures using advanced algorithms",
      });
    });
  });

  describe("selectTab", () => {
    it("should navigate to themes with query param for non-tools tabs", () => {
      component.selectTab("structure-prediction");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "structure-prediction" },
      });
      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should update active tab signal", () => {
      component.selectTab("structure-search");

      expect(component.activeTab()).toBe("structure-search");
    });
  });

  describe("isActiveTab", () => {
    it("should return true for active tab", () => {
      component.activeTab.set("binder-design");

      expect(component.isActiveTab("binder-design")).toBe(true);
    });

    it("should return false for inactive tab", () => {
      component.activeTab.set("binder-design");

      expect(component.isActiveTab("structure-prediction")).toBe(false);
    });
  });

  describe("checkRoute", () => {
    it("should show tabs for themes route", () => {
      component["checkRoute"]("/themes");

      expect(component.showTabs()).toBe(true);
    });

    it("should hide tabs for non-themes route", () => {
      component["checkRoute"]("/tools");

      expect(component.showTabs()).toBe(false);
    });

    it("should set active tab from query parameters", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "structure-prediction" },
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes?tab=structure-prediction");

      expect(component.activeTab()).toBe("structure-prediction");
      expect(component.showTabs()).toBe(true);
    });

    it("should default to binder-design when no tab specified", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: {},
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes");

      expect(component.activeTab()).toBe("binder-design");
    });

    it("should handle themes route with other query parameters", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "structure-search", search: "test" },
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes?tab=structure-search&search=test");

      expect(component.activeTab()).toBe("structure-search");
      expect(component.showTabs()).toBe(true);
    });
  });

  describe("tabs data", () => {
    it("should have all required tab properties", () => {
      component.tabs.forEach((tab) => {
        expect(tab.id).toBeDefined();
        expect(tab.label).toBeDefined();
        expect(tab.description).toBeDefined();
      });
    });

    it("should have unique tab IDs", () => {
      const ids = component.tabs.map((tab) => tab.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe("router events", () => {
    it("should update route state on NavigationEnd events", () => {
      const navigationEnd = new NavigationEnd(
        1,
        "/themes?tab=structure-search",
        "/themes?tab=structure-search"
      );

      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "structure-search" },
        fragment: null,
      } as unknown as UrlTree);

      routerEventsSubject.next(navigationEnd);

      expect(component.showTabs()).toBe(true);
      expect(component.activeTab()).toBe("structure-search");
    });

    it("should handle non-NavigationEnd router events", () => {
      const initialActiveTab = component.activeTab();

      // Send a different type of router event
      routerEventsSubject.next({} as NavigationEnd);

      // Should not change the active tab
      expect(component.activeTab()).toBe(initialActiveTab);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle null queryParams", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: {},
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes");

      expect(component.activeTab()).toBe("binder-design");
    });

    it("should handle invalid tab parameter", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "invalid-tab-name" },
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes?tab=invalid-tab-name");

      // Should still work and set the invalid tab
      expect(component.activeTab()).toBe("invalid-tab-name");
    });

    it("should handle empty query parameters object", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: {},
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes");

      expect(component.activeTab()).toBe("binder-design");
      expect(component.showTabs()).toBe(true);
    });
  });
  describe("initialization edge cases", () => {
    it("should initialize correctly with different initial routes", () => {
      // Test that non-themes routes don't show tabs
      component["checkRoute"]("/tools");
      expect(component.showTabs()).toBe(false);

      component["checkRoute"]("/home");
      expect(component.showTabs()).toBe(false);
    });
  });

  describe("navigateToTheme", () => {
    it("should navigate to themes with the given tab query param", () => {
      component.navigateToTheme("binder-design");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "binder-design" },
      });
    });

    it("should navigate to themes with structure-prediction tab", () => {
      component.navigateToTheme("structure-prediction");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "structure-prediction" },
      });
    });
  });

  describe("breadcrumb behaviour", () => {
    it("should show breadcrumb for a known workflow route", () => {
      component["checkRoute"]("/de-novo-design");

      expect(component.showBreadcrumb()).toBe(true);
      expect(component.breadcrumb()).toEqual({
        themeLabel: "Binder Design",
        themeTab: "binder-design",
        workflowLabel: "De Novo Design",
      });
    });

    it("should show correct breadcrumb for single-structure-prediction route", () => {
      component["checkRoute"]("/single-structure-prediction");

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

    it("should clear breadcrumb when navigating back to /themes", () => {
      component["checkRoute"]("/de-novo-design");
      expect(component.showBreadcrumb()).toBe(true);

      component["checkRoute"]("/themes");
      expect(component.showBreadcrumb()).toBe(false);
      expect(component.breadcrumb()).toBeNull();
    });

    it("should not show tabs on workflow routes", () => {
      component["checkRoute"]("/de-novo-design");

      expect(component.showTabs()).toBe(false);
    });

    it("should strip query params when matching workflow routes", () => {
      component["checkRoute"]("/de-novo-design?foo=bar");

      expect(component.showBreadcrumb()).toBe(true);
    });
  });

  describe("selectTab edge cases", () => {
    it("should handle navigation failures gracefully", async () => {
      mockRouter.navigate.and.returnValue(Promise.resolve(false));

      component.selectTab("structure-prediction");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "structure-prediction" },
      });
      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should handle other tab navigation with query params", () => {
      component.selectTab("structure-prediction");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "structure-prediction" },
      });
      expect(component.activeTab()).toBe("structure-prediction");
    });
  });

  describe("complex URL scenarios", () => {
    it("should handle URLs with multiple query parameters", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: {
          tab: "structure-prediction",
          filter: "active",
          page: "2",
        },
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"](
        "/themes?tab=structure-prediction&filter=active&page=2"
      );

      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should handle URLs with fragments", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "binder-design" },
        fragment: "section1",
      } as unknown as UrlTree);

      component["checkRoute"]("/themes?tab=binder-design#section1");

      expect(component.activeTab()).toBe("binder-design");
    });

    it("should handle case-sensitive tab names", () => {
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "BINDER-DESIGN" },
        fragment: null,
      } as unknown as UrlTree);

      component["checkRoute"]("/themes?tab=BINDER-DESIGN");

      expect(component.activeTab()).toBe("BINDER-DESIGN");
    });
  });

  describe("scroll functionality", () => {
    beforeEach(() => {
      // Mock the ViewChild element
      const mockElement = {
        scrollBy: jasmine.createSpy("scrollBy"),
        scrollLeft: 100,
        scrollWidth: 500,
        clientWidth: 300,
      };

      component.tabsContainer = {
        nativeElement: mockElement,
      } as unknown as ElementRef<HTMLElement>;
    });

    it("should scroll left when scrollLeft is called", () => {
      component.scrollLeft();

      expect(component.tabsContainer.nativeElement.scrollBy).toHaveBeenCalled();
    });

    it("should scroll right when scrollRight is called", () => {
      component.scrollRight();

      expect(component.tabsContainer.nativeElement.scrollBy).toHaveBeenCalled();
    });

    it("should handle scrolling when container is not available", () => {
      component.tabsContainer = undefined as unknown as ElementRef<HTMLElement>;

      expect(() => component.scrollLeft()).not.toThrow();
      expect(() => component.scrollRight()).not.toThrow();
    });

    it("should update scroll state on scroll event", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spyOn(component as any, "updateScrollState");

      component.onScroll();

      expect(component["updateScrollState"]).toHaveBeenCalled();
    });

    it("should update scroll state correctly", () => {
      // Mock container with specific values
      const mockElement = {
        scrollLeft: 100,
        scrollWidth: 500,
        clientWidth: 300,
      };

      component.tabsContainer = {
        nativeElement: mockElement,
      } as unknown as ElementRef<HTMLElement>;

      component["updateScrollState"]();

      expect(component.canScrollLeft()).toBe(true);
      expect(component.canScrollRight()).toBe(true);
    });

    it("should handle updateScrollState when container is not available", () => {
      component.tabsContainer = undefined as unknown as ElementRef<HTMLElement>;

      expect(() => component["updateScrollState"]()).not.toThrow();
    });

    it("should update scroll state when can't scroll left", () => {
      const mockElement = {
        scrollLeft: 0,
        scrollWidth: 300,
        clientWidth: 300,
      };

      component.tabsContainer = {
        nativeElement: mockElement,
      } as unknown as ElementRef<HTMLElement>;

      component["updateScrollState"]();

      expect(component.canScrollLeft()).toBe(false);
      expect(component.canScrollRight()).toBe(false);
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
      mockRouter.navigate.and.returnValue(
        Promise.reject(new Error("nav error"))
      );
      component.isMobileMenuOpen.set(true);
      component.navigate("/about");
      await new Promise((resolve) => setTimeout(resolve, 10));

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

  describe("component lifecycle", () => {
    it("should properly initialize on component creation", () => {
      expect(component.tabs).toBeDefined();
      expect(component.tabs.length).toBeGreaterThan(0);
      expect(component.activeTab()).toBeDefined();
      expect(typeof component.showTabs()).toBe("boolean");
    });

    it("should handle multiple tab selections in sequence", () => {
      const tabSequence = [
        "binder-design",
        "structure-prediction",
        "structure-search",
        "tools",
      ];

      tabSequence.forEach((tabId) => {
        component.selectTab(tabId);
        expect(component.activeTab()).toBe(tabId);
      });
    });

    it("should maintain state consistency during route changes", () => {
      // Set initial state by calling checkRoute with themes
      component["checkRoute"]("/themes");
      expect(component.showTabs()).toBe(true);

      // Simulate route change to non-themes
      component["checkRoute"]("/home");
      expect(component.showTabs()).toBe(false);
    });

    it("should correctly identify active tab", () => {
      component.activeTab.set("structure-prediction");

      expect(component.isActiveTab("structure-prediction")).toBe(true);
      expect(component.isActiveTab("binder-design")).toBe(false);
      expect(component.isActiveTab("tools")).toBe(false);
    });

    it("should handle ngAfterViewInit lifecycle", (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spyOn(component as any, "updateScrollState");

      component.ngAfterViewInit();

      // Since updateScrollState is called with setTimeout, we need to wait
      setTimeout(() => {
        expect(component["updateScrollState"]).toHaveBeenCalled();
        done();
      }, 150);
    });
  });
});
