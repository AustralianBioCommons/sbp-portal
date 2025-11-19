import { animate, style, transition, trigger } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroBars3,
  heroHome,
  heroInformationCircle,
  heroWrenchScrewdriver,
  heroXMark,
} from "@ng-icons/heroicons/outline";
import { tablerCalendarStar } from "@ng-icons/tabler-icons";
import { filter, map } from "rxjs/operators";
import { AuthService } from "../../cores/auth.service";
import { ButtonComponent } from "../button/button.component";

export interface NavItem {
  label: string;
  path?: string;
  queryParams?: { [key: string]: string }; // Query parameters for navigation
  icon?: string;
  image?: string; // For custom images from assets
  action?: () => void;
  children?: NavItem[];
  requiresAuth?: boolean;
}

@Component({
  selector: "app-navbar",
  imports: [CommonModule, NgIconComponent, ButtonComponent],
  providers: [
    provideIcons({
      heroHome,
      heroWrenchScrewdriver,
      heroBars3,
      heroXMark,
      heroInformationCircle,
      tablerCalendarStar,
    }),
  ],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
  animations: [
    trigger("slideInOut", [
      transition(":enter", [
        style({ transform: "translateY(-10px)", opacity: 0 }),
        animate(
          "250ms ease-out",
          style({ transform: "translateY(0)", opacity: 1 })
        ),
      ]),
      transition(":leave", [
        animate(
          "200ms ease-in",
          style({ transform: "translateY(-10px)", opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class Navbar {
  private auth = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  // Navigation state
  isMobileMenuOpen = signal(false);

  // Active route tracking
  currentRoute = signal("");
  currentTab = signal("");

  // Expose auth observables
  isAuthenticated$ = this.auth.isAuthenticated$;

  // Navigation items
  navItems: NavItem[] = [
    {
      label: "Home",
      path: "/themes",
      queryParams: { tab: "binder-design" },
      icon: "heroHome",
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
          requiresAuth: false,
        },
        {
          label: "Structure search",
          path: "/themes",
          queryParams: { tab: "structure-search" },
          requiresAuth: false,
        },
      ],
    },
    {
      label: "Pre-config workflows",
      image: "/assets/workflow-square-01.png",
      children: [
        {
          label: "De Novo Design",
          path: "/de-novo-design",
        },
        {
          label: "Interaction Screening",
          path: "/interaction-screening",
        },
      ],
    },
    {
      label: "Tools",
      path: "/tools",
      icon: "heroWrenchScrewdriver",
    },
    {
      label: "Jobs",
      path: "/jobs",
      image: "/assets/job-run.png",
    },
    {
      label: "About",
      path: "/about",
      icon: "heroInformationCircle",
    },
    {
      label: "Workshops & Events",
      path: "/events",
      icon: "tablerCalendarStar",
    },
    {
      label: "Support/FAQ",
      path: "/support",
      image: "/assets/contact-support-outline-rounded.png",
    },
  ];

  constructor() {
    // Initialize current route state after a small delay to ensure router is ready
    setTimeout(() => {
      this.updateRouteState();
    }, 0);

    // Track route changes to determine active tab
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .subscribe(() => {
        this.updateRouteState();
      });

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".compact-menu") &&
        !target.closest(".compact-menu-button")
      ) {
        if (this.isMobileMenuOpen()) {
          console.log("Closing menu due to outside click");
          this.isMobileMenuOpen.set(false);
        }
      }
    });

    // Close menu on escape key
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isMobileMenuOpen()) {
        console.log("Closing menu due to escape key");
        this.isMobileMenuOpen.set(false);
      }
    });
  }

  toggleMobileMenu() {
    console.log("Toggle menu clicked, current state:", this.isMobileMenuOpen());
    this.isMobileMenuOpen.update((open) => !open);
    console.log("Menu state after toggle:", this.isMobileMenuOpen());
  }

  navigate(path: string, queryParams?: { [key: string]: string }) {
    console.log(
      "Navigate to:",
      path,
      queryParams ? "with params:" : "",
      queryParams || ""
    );

    if (queryParams) {
      this.router
        .navigate([path], { queryParams })
        .then(() => {
          this.closeMobileMenu();
        })
        .catch((error) => {
          console.error("Navigation failed:", error);
          this.closeMobileMenu();
        });
    } else {
      this.router
        .navigate([path])
        .then(() => {
          this.closeMobileMenu();
        })
        .catch((error) => {
          console.error("Navigation failed:", error);
          this.closeMobileMenu();
        });
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  executeAction(action?: () => void) {
    if (action) {
      action();
    }
    this.closeMobileMenu();
  }

  shouldShowNavItem(item: NavItem, isAuthenticated: boolean): boolean {
    return !item.requiresAuth || isAuthenticated;
  }

  isNavItemActive(item: NavItem): boolean {
    if (!item.path) return false;

    // Check if route matches
    if (this.currentRoute() !== item.path) return false;

    // If no query parameters expected, simple path match is sufficient
    if (!item.queryParams) return true;

    // Check if all expected query parameters match current URL
    const urlTree = this.router.parseUrl(this.router.url);
    for (const [key, expectedValue] of Object.entries(item.queryParams)) {
      if (urlTree.queryParams[key] !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  isParentNavItemActive(item: NavItem): boolean {
    if (!item.children) return this.isNavItemActive(item);

    // Check if any child is active
    return item.children.some((child) => this.isNavItemActive(child));
  }

  private updateRouteState(): void {
    // Update current route
    this.currentRoute.set(this.router.url.split("?")[0]);

    // Extract tab from query parameters
    const urlTree = this.router.parseUrl(this.router.url);
    const tab = urlTree.queryParams["tab"];
    this.currentTab.set(tab || "");
  }
}
