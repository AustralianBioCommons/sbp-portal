import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient, withXhr } from "@angular/common/http";
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
        url: "/binder-design/de-novo-design?tab=about#overview",
        events: routerEventsSubject.asObservable(),
      }
    );
    // RouterLink computes anchor hrefs via these Router APIs.
    mockRouter.createUrlTree.and.returnValue({} as UrlTree);
    mockRouter.serializeUrl.and.returnValue("/");

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideHttpClient(withXhr()),
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
    it("should activate the workflow category on initial load without a breadcrumb", () => {
      const el: HTMLElement = fixture.nativeElement;
      const activeLink = el.querySelector(
        '[aria-label="Main navigation"] .border-biocommons-primary'
      );

      expect(activeLink?.textContent?.trim()).toBe("Binder Design");
      expect(activeLink?.classList.contains("border-biocommons-primary")).toBe(
        true
      );
      expect(activeLink?.getAttribute("aria-current")).toBeNull();
      expect(el.querySelector('[aria-label="Breadcrumb"]')).toBeNull();
    });

    for (const { url, category } of [
      { url: "/binder-design/de-novo-design", category: "Binder Design" },
      {
        url: "/structure-prediction/single-prediction",
        category: "Structure Prediction",
      },
      {
        url: "/structure-prediction/bulk-prediction",
        category: "Structure Prediction",
      },
      {
        url: "/structure-prediction/interaction-screening",
        category: "Structure Prediction",
      },
    ]) {
      it(`should keep the category underline active on ${url}`, () => {
        routerEventsSubject.next(new NavigationEnd(1, url, url));
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        const activeLinks = el.querySelectorAll(
          '[aria-label="Main navigation"] .border-biocommons-primary'
        );
        const activeWorkflow = el.querySelector(
          '[aria-label="Mobile navigation"] .ml-6 [aria-current="page"]'
        );
        const currentPages = el.querySelectorAll(
          '[aria-label="Mobile navigation"] [aria-current="page"]'
        );

        expect(activeLinks.length).toBe(1);
        expect(activeLinks[0].textContent?.trim()).toBe(category);
        expect(activeLinks[0].getAttribute("aria-current")).toBeNull();
        expect(activeWorkflow?.classList.contains("bg-sky-50")).toBe(true);
        expect(currentPages.length).toBe(1);
        expect(activeWorkflow).toBe(currentPages[0]);
      });
    }

    for (const { url, label } of [
      { url: "/binder-design", label: "Binder Design" },
      { url: "/structure-prediction", label: "Structure Prediction" },
      { url: "/my-jobs", label: "My Jobs" },
    ]) {
      it(`should mark only ${url} as the current page in each navigation`, () => {
        const route = `${url}?source=nav#top`;
        routerEventsSubject.next(new NavigationEnd(1, route, route));
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        for (const navigation of ["Main navigation", "Mobile navigation"]) {
          const currentPages = el.querySelectorAll(
            `[aria-label="${navigation}"] [aria-current="page"]`
          );

          expect(currentPages.length).toBe(1);
          expect(currentPages[0].textContent?.trim()).toBe(label);
        }
      });
    }

    it("should use the redirected route without query params or fragments", () => {
      routerEventsSubject.next(
        new NavigationEnd(
          1,
          "/legacy-workflow",
          "/structure-prediction/single-prediction?tab=about#overview"
        )
      );

      expect(component.currentRoute()).toBe(
        "/structure-prediction/single-prediction"
      );
      expect(component.isNavItemActive(component.desktopNavItems[0])).toBe(
        false
      );
      expect(component.isNavItemActive(component.desktopNavItems[1])).toBe(
        true
      );
    });

    it("should ignore non-NavigationEnd router events", () => {
      routerEventsSubject.next({} as NavigationEnd);

      expect(component.currentRoute()).toBe("/binder-design/de-novo-design");
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

    it("should not activate items with a shared path prefix", () => {
      component.currentRoute.set("/binder-design-other/de-novo-design");

      expect(component.isNavItemActive(component.desktopNavItems[0])).toBe(
        false
      );
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
