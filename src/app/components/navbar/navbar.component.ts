import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, NavigationEnd } from "@angular/router";
import {
  trigger,
  style,
  transition,
  animate,
} from "@angular/animations";
import { filter, map } from "rxjs/operators";
import { AuthService } from "../../cores/auth.service";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroHome,
  heroWrenchScrewdriver,
  heroBars3,
  heroXMark,
  heroInformationCircle,
} from "@ng-icons/heroicons/outline";
import { tablerCalendarStar } from "@ng-icons/tabler-icons";

export interface NavItem {
  label: string;
  path?: string;
  icon?: string;
  image?: string; // For custom images from assets
  action?: () => void;
  children?: NavItem[];
  requiresAuth?: boolean;
}

@Component({
  selector: "app-navbar",
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroHome,
      heroWrenchScrewdriver,
      heroBars3,
      heroXMark,
      heroInformationCircle,
      tablerCalendarStar
    })
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
        )
      ]),
      transition(":leave", [
        animate(
          "200ms ease-in",
          style({ transform: "translateY(-10px)", opacity: 0 })
        )
      ])
    ])
  ]
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
      icon: "heroHome",
      children: [
        { label: "Binder design", path: "/themes?tab=binder-design" },
        {
          label: "Structure prediction",
          path: "/themes?tab=structure-prediction",
          requiresAuth: false
        },
        {
          label: "Structure search",
          path: "/themes?tab=structure-search",
          requiresAuth: false
        }
      ]
    },
    {
      label: "Pre-config workflows",
      image: "/assets/workflow-square-01.png",
      children: [
        {
          label: "De Novo Design",
          path: "/workflow/de-novo-design"
        },
        {
          label: "Motif Scaffolding",
          path: "/workflow/motif-scaffolding"
        },
        {
          label: "Partial Diffusion",
          path: "/workflow/partial-diffusion"
        }
      ]
    },
    {
      label: "Tools",
      path: "/tools",
      icon: "heroWrenchScrewdriver"
    },
    {
      label: "Jobs",
      path: "/jobs",
      image: "/assets/job-run.png"
    },
    {
      label: "About",
      path: "/about",
      icon: "heroInformationCircle"
    },
    {
      label: "Workshops & Events",
      path: "/events",
      icon: "tablerCalendarStar"
    },
    {
      label: "Support/FAQ",
      path: "/support",
      image: "/assets/contact-support-outline-rounded.png"
    }
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
  }

  toggleMobileMenu() {
    console.log("Toggle menu clicked, current state:", this.isMobileMenuOpen());
    this.isMobileMenuOpen.update((open) => !open);
    console.log("Menu state after toggle:", this.isMobileMenuOpen());
  }

  navigate(path: string) {
    console.log("Navigate to:", path);

    // Check if path contains query parameters
    if (path.includes("?")) {
      const [routePath, queryString] = path.split("?");
      const queryParams: { [key: string]: string } = {};

      // Parse query parameters
      queryString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key && value) {
          queryParams[key] = value;
        }
      });

      this.router
        .navigate([routePath], { queryParams })
        .then(() => {
          this.closeMobileMenu();
        })
        .catch((error) => {
          console.error("Navigation failed:", error);
          this.closeMobileMenu();
        });
    } else {
      // Simple navigation without query parameters
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

    // Handle paths with query parameters
    if (item.path.includes("?")) {
      const [routePath, queryString] = item.path.split("?");

      // Check if route matches
      if (this.currentRoute() !== routePath) return false;

      // Extract expected tab from the path
      const queryParams = new URLSearchParams(queryString);
      const expectedTab = queryParams.get("tab");

      // Check if tab matches
      return expectedTab === this.currentTab();
    }

    // For simple paths without query parameters
    return this.currentRoute() === item.path;
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
