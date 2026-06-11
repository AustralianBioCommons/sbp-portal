import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute } from "@angular/router";
import { of, BehaviorSubject } from "rxjs";

import Home from "./home";

describe("Home", () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let dataSubject: BehaviorSubject<Record<string, string>>;

  beforeEach(async () => {
    dataSubject = new BehaviorSubject({});

    const activatedRouteMock = {
      params: of({}),
      queryParams: of({}),
      fragment: of(null),
      data: dataSubject.asObservable(),
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
      expect(component.tabs.length).toBe(3);
      expect(component.tabs[0]).toEqual({
        id: "binder-design",
        label: "Binder Design",
        description: "Design and optimize protein binders for specific targets",
      });
      expect(component.tabs[2]).toEqual({
        id: "tools",
        label: "Tools",
        description: "Access various computational biology tools and utilities",
      });
    });
  });

  describe("ngOnInit and route data handling", () => {
    it("should update active tab when tab route data is provided", () => {
      dataSubject.next({ tab: "structure-prediction" });

      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should update active tab when different tab route data is provided", () => {
      dataSubject.next({ tab: "structure-search" });

      expect(component.activeTab()).toBe("structure-search");
    });

    it("should update active tab when tools tab route data is provided", () => {
      dataSubject.next({ tab: "tools" });

      expect(component.activeTab()).toBe("tools");
    });

    it("should not change active tab when no tab route data is provided", () => {
      const initialTab = component.activeTab();
      dataSubject.next({ otherData: "value" });

      expect(component.activeTab()).toBe(initialTab);
    });

    it("should not change active tab when tab route data is empty", () => {
      const initialTab = component.activeTab();
      dataSubject.next({ tab: "" });

      expect(component.activeTab()).toBe(initialTab);
    });

    it("should handle multiple route data properties with tab property", () => {
      dataSubject.next({
        tab: "structure-prediction",
        search: "test",
        filter: "active",
      });

      expect(component.activeTab()).toBe("structure-prediction");
    });

    it("should handle route data updates multiple times", () => {
      dataSubject.next({ tab: "structure-prediction" });
      expect(component.activeTab()).toBe("structure-prediction");

      dataSubject.next({ tab: "structure-search" });
      expect(component.activeTab()).toBe("structure-search");

      dataSubject.next({ tab: "binder-design" });
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

  describe("structure prediction rendering", () => {
    it("should render structure prediction content when tab is active", () => {
      component.activeTab.set("structure-prediction");
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector("h1");
      expect(title?.textContent).toContain("Structure Prediction");
    });

    it("should apply structure prediction background class", () => {
      component.activeTab.set("structure-prediction");
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(".bg-gray-100");
      expect(container?.classList.contains("structure-prediction-bg")).toBe(
        true
      );
      expect(container?.classList.contains("bg-gray-50")).toBe(false);
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
      const expectedIds = ["binder-design", "structure-prediction", "tools"];
      const actualIds = component.tabs.map((tab) => tab.id);

      expect(actualIds).toEqual(expectedIds);
    });
  });
});
