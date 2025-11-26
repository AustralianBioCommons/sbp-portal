import { ElementRef } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  UrlTree,
} from "@angular/router";
import { of, Subject } from "rxjs";
import { AuthService } from "../../cores/services/auth.service";

import { Header } from "./header.component";

describe("Header", () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
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

    const mockActivatedRoute = {
      params: of({}),
      queryParams: of({}),
      fragment: of(null),
      data: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
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
      expect(component.tabs.length).toBe(4);
      expect(component.tabs[0]).toEqual({
        id: "binder-design",
        label: "Binder Design",
        description: "Design and optimize protein binders for specific targets",
      });
      expect(component.tabs[3]).toEqual({
        id: "tools",
        label: "Tools",
        description: "Access various computational biology tools and utilities",
      });
    });
  });

  describe("selectTab", () => {
    it("should navigate to tools route when tools tab is selected", () => {
      component.selectTab("tools");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/tools"]);
      expect(component.activeTab()).toBe("tools");
    });

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

  describe("selectTab edge cases", () => {
    it("should handle navigation failures gracefully", async () => {
      mockRouter.navigate.and.returnValue(Promise.resolve(false));

      component.selectTab("tools");

      expect(mockRouter.navigate).toHaveBeenCalledWith(["/tools"]);
      expect(component.activeTab()).toBe("tools");
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
