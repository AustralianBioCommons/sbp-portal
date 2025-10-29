import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router, ActivatedRoute, UrlTree } from "@angular/router";
import { AuthService } from "../../cores/auth.service";
import { of } from "rxjs";

import { Header } from "./header.component";

describe("Header", () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
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
        queryParams: {},
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
});
