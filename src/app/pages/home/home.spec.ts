import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute } from "@angular/router";
import { of, BehaviorSubject } from "rxjs";

import { Home } from "./home";

describe("Home", () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject({});

    const activatedRouteMock = {
      params: of({}),
      queryParams: queryParamsSubject.asObservable(),
      fragment: of(null),
      data: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [{ provide: ActivatedRoute, useValue: activatedRouteMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("initialization", () => {
    it("should initialize with default active tab", () => {
      expect(component.activeTab()).toBe("binder-design");
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

  describe("ngOnInit and query parameter handling", () => {
    it("should update active tab when tab query parameter is provided", () => {
      queryParamsSubject.next({ tab: "structure-prediction" });

      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should update active tab when different tab query parameter is provided", () => {
      queryParamsSubject.next({ tab: "structure-search" });

      expect(component.activeTab()).toBe("structure-search");
    });

    it("should update active tab when tools tab query parameter is provided", () => {
      queryParamsSubject.next({ tab: "tools" });

      expect(component.activeTab()).toBe("tools");
    });

    it("should not change active tab when no tab query parameter is provided", () => {
      const initialTab = component.activeTab();
      queryParamsSubject.next({ otherParam: "value" });

      expect(component.activeTab()).toBe(initialTab);
    });

    it("should not change active tab when tab query parameter is empty", () => {
      const initialTab = component.activeTab();
      queryParamsSubject.next({ tab: "" });

      expect(component.activeTab()).toBe(initialTab);
    });

    it("should handle multiple query parameters with tab parameter", () => {
      queryParamsSubject.next({
        tab: "structure-prediction",
        search: "test",
        filter: "active",
      });

      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should handle query parameter updates multiple times", () => {
      queryParamsSubject.next({ tab: "structure-prediction" });
      expect(component.activeTab()).toBe("structure-prediction");

      queryParamsSubject.next({ tab: "structure-search" });
      expect(component.activeTab()).toBe("structure-search");

      queryParamsSubject.next({ tab: "binder-design" });
      expect(component.activeTab()).toBe("binder-design");
    });
  });

  describe("isActiveTab", () => {
    it("should return true for active tab", () => {
      component.activeTab.set("structure-prediction");

      expect(component.isActiveTab("structure-prediction")).toBe(true);
    });

    it("should return false for inactive tab", () => {
      component.activeTab.set("structure-prediction");

      expect(component.isActiveTab("binder-design")).toBe(false);
    });

    it("should return true for default active tab", () => {
      expect(component.isActiveTab("binder-design")).toBe(true);
    });

    it("should handle all tab types correctly", () => {
      const tabIds = [
        "binder-design",
        "structure-prediction",
        "structure-search",
        "tools",
      ];

      tabIds.forEach((tabId) => {
        component.activeTab.set(tabId);
        expect(component.isActiveTab(tabId)).toBe(true);

        // All other tabs should be inactive
        tabIds
          .filter((id) => id !== tabId)
          .forEach((inactiveId) => {
            expect(component.isActiveTab(inactiveId)).toBe(false);
          });
      });
    });
  });

  describe("tabs data validation", () => {
    it("should have all required tab properties", () => {
      component.tabs.forEach((tab) => {
        expect(tab.id).toBeDefined();
        expect(tab.id).not.toBe("");
        expect(tab.label).toBeDefined();
        expect(tab.label).not.toBe("");
        expect(tab.description).toBeDefined();
        expect(tab.description).not.toBe("");
      });
    });

    it("should have unique tab IDs", () => {
      const ids = component.tabs.map((tab) => tab.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it("should have consistent tab structure with expected IDs", () => {
      const expectedIds = [
        "binder-design",
        "structure-prediction",
        "structure-search",
        "tools",
      ];
      const actualIds = component.tabs.map((tab) => tab.id);

      expect(actualIds).toEqual(expectedIds);
    });
  });
});
