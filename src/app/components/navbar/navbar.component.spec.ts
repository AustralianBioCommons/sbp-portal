import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, UrlTree } from "@angular/router";
import { of } from "rxjs";
import { AuthService } from "../../cores/auth.service";

import { Navbar } from "./navbar.component";

describe("Navbar", () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj("AuthService", ["login", "logout"], {
      isAuthenticated$: of(false),
      user$: of(null),
      error$: of(null),
    });

    mockRouter = jasmine.createSpyObj("Router", ["navigate", "parseUrl"], {
      url: "/themes",
      events: of(),
    });
    mockRouter.parseUrl.and.returnValue({
      queryParams: {},
      fragment: null,
    } as unknown as UrlTree);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    const mockActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      fragment: of(null),
      data: of({}),
      firstChild: null,
    };

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("toggleMobileMenu", () => {
    it("should toggle mobile menu state", () => {
      expect(component.isMobileMenuOpen()).toBe(false);

      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen()).toBe(true);

      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });

  describe("closeMobileMenu", () => {
    it("should close mobile menu", () => {
      component.isMobileMenuOpen.set(true);
      expect(component.isMobileMenuOpen()).toBe(true);

      component.closeMobileMenu();
      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });

  describe("navigate", () => {
    it("should navigate to simple path without query parameters", async () => {
      await component.navigate("/tools");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/tools"]);
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should navigate to path with query parameters", async () => {
      await component.navigate("/themes", { tab: "binder-design" });

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "binder-design" },
      });
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should navigate to path with multiple query parameters", async () => {
      await component.navigate("/themes", {
        tab: "structure-prediction",
        search: "test",
      });

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/themes"], {
        queryParams: { tab: "structure-prediction", search: "test" },
      });
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should handle navigation error gracefully without query params", async () => {
      mockRouter.navigate.and.returnValue(Promise.reject("Navigation error"));
      spyOn(console, "error");

      try {
        await component.navigate("/invalid-path");
      } catch {
        // Error is expected
      }

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith(
        "Navigation failed:",
        "Navigation error"
      );
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should handle navigation error gracefully with query params", async () => {
      mockRouter.navigate.and.returnValue(
        Promise.reject("Navigation error with params")
      );
      spyOn(console, "error");

      try {
        await component.navigate("/invalid-path", { tab: "test" });
      } catch {
        // Error is expected
      }

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith(
        "Navigation failed:",
        "Navigation error with params"
      );
      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });

  describe("executeAction", () => {
    it("should execute provided action and close menu", () => {
      const mockAction = jasmine.createSpy("mockAction");
      component.isMobileMenuOpen.set(true);

      component.executeAction(mockAction);

      expect(mockAction).toHaveBeenCalled();
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should close menu when no action provided", () => {
      component.isMobileMenuOpen.set(true);

      component.executeAction();

      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });

  describe("shouldShowNavItem", () => {
    it("should show nav item when no auth required", () => {
      const item = { label: "Public Item", path: "/public" };

      expect(component.shouldShowNavItem(item, false)).toBe(true);
      expect(component.shouldShowNavItem(item, true)).toBe(true);
    });

    it("should show nav item when auth required and user is authenticated", () => {
      const item = {
        label: "Protected Item",
        path: "/protected",
        requiresAuth: true,
      };

      expect(component.shouldShowNavItem(item, true)).toBe(true);
    });

    it("should hide nav item when auth required and user is not authenticated", () => {
      const item = {
        label: "Protected Item",
        path: "/protected",
        requiresAuth: true,
      };

      expect(component.shouldShowNavItem(item, false)).toBe(false);
    });
  });

  describe("isNavItemActive", () => {
    beforeEach(() => {
      component.currentRoute.set("/themes");
      component.currentTab.set("binder-design");
    });

    it("should return false for item without path", () => {
      const item = { label: "No Path Item" };

      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return true for simple path match", () => {
      component.currentRoute.set("/tools");
      const item = { label: "Tools", path: "/tools" };

      expect(component.isNavItemActive(item)).toBe(true);
    });

    it("should return false for simple path mismatch", () => {
      component.currentRoute.set("/tools");
      const item = { label: "Jobs", path: "/jobs" };

      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return true for path with matching tab query parameter", () => {
      // Mock parseUrl to return the expected query parameters
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "binder-design" },
        fragment: null,
      } as unknown as UrlTree);

      const item = {
        label: "Binder Design",
        path: "/themes",
        queryParams: { tab: "binder-design" },
      };

      expect(component.isNavItemActive(item)).toBe(true);
    });

    it("should return false for path with non-matching tab query parameter", () => {
      const item = {
        label: "Structure Prediction",
        path: "/themes",
        queryParams: { tab: "structure-prediction" },
      };

      expect(component.isNavItemActive(item)).toBe(false);
    });

    it("should return false for path with matching tab but different route", () => {
      component.currentRoute.set("/other");
      const item = {
        label: "Binder Design",
        path: "/themes",
        queryParams: { tab: "binder-design" },
      };

      expect(component.isNavItemActive(item)).toBe(false);
    });
  });

  describe("isParentNavItemActive", () => {
    beforeEach(() => {
      component.currentRoute.set("/themes");
      component.currentTab.set("binder-design");
    });

    it("should return result of isNavItemActive for item without children", () => {
      const item = { label: "Tools", path: "/tools" };

      expect(component.isParentNavItemActive(item)).toBe(false);
    });

    it("should return true when at least one child is active", () => {
      // Mock parseUrl to return the expected query parameters
      mockRouter.parseUrl.and.returnValue({
        queryParams: { tab: "binder-design" },
        fragment: null,
      } as unknown as UrlTree);

      const item = {
        label: "Home",
        path: "/themes",
        children: [
          {
            label: "Binder design",
            path: "/themes",
            queryParams: { tab: "binder-design" },
          },
          {
            label: "Structure prediction",
            path: "/themes",
            queryParams: { tab: "structure-prediction" },
          },
        ],
      };

      expect(component.isParentNavItemActive(item)).toBe(true);
    });

    it("should return false when no children are active", () => {
      component.currentTab.set("other-tab");
      const item = {
        label: "Home",
        path: "/themes",
        children: [
          {
            label: "Binder design",
            path: "/themes",
            queryParams: { tab: "binder-design" },
          },
          {
            label: "Structure prediction",
            path: "/themes",
            queryParams: { tab: "structure-prediction" },
          },
        ],
      };

      expect(component.isParentNavItemActive(item)).toBe(false);
    });
  });

  describe("navigation items", () => {
    it("should have correct navigation items structure", () => {
      expect(component.navItems.length).toBeGreaterThan(0);
      expect(component.navItems[0].label).toBe("Home");
      expect(component.navItems[0].path).toBe("/themes");
      expect(component.navItems[0].children).toBeDefined();
    });
  });

  describe("navigation error handling", () => {
    it("should call navigate method", () => {
      component.navigate("/test?tab=test");
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });

  describe("outside click handling", () => {
    it("should close mobile menu when clicking outside", () => {
      component.isMobileMenuOpen.set(true);
      const consoleLogSpy = spyOn(console, "log");

      // Simulate clicking outside the menu
      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", {
        value: document.createElement("div"),
        enumerable: true,
      });

      document.dispatchEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Closing menu due to outside click"
      );
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it("should not close mobile menu when clicking inside menu", () => {
      component.isMobileMenuOpen.set(true);

      const menuElement = document.createElement("div");
      menuElement.className = "compact-menu";
      document.body.appendChild(menuElement);

      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", {
        value: menuElement,
        enumerable: true,
      });

      document.dispatchEvent(event);

      expect(component.isMobileMenuOpen()).toBe(true);

      document.body.removeChild(menuElement);
    });

    it("should close mobile menu on escape key press", () => {
      // Open the menu first
      component.isMobileMenuOpen.set(true);
      expect(component.isMobileMenuOpen()).toBe(true);

      // Simulate escape key press
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);

      expect(component.isMobileMenuOpen()).toBe(false);
    });
  });
});
