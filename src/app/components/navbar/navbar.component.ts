import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowRightEndOnRectangle,
  heroArrowRightStartOnRectangle,
  heroBars3,
  heroCalendarDays,
  heroChevronRight,
  heroClipboardDocumentList,
  heroHome,
  heroInformationCircle,
  heroQuestionMarkCircle,
  heroRectangleGroup,
  heroUser,
  heroUserCircle,
  heroXMark,
} from "@ng-icons/heroicons/outline";
import { catchError, distinctUntilChanged, filter, of, switchMap } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../cores/auth.service";
import {
  CreditsService,
  TOTAL_CREDITS,
  USER_CREDITS_ENABLED,
} from "../../cores/services/credits.service";
import { THEMES } from "../../cores/config/themes.config";
import { DropdownMenuComponent } from "../dropdown-menu/dropdown-menu.component";
import { ButtonComponent } from "../button/button.component";

export interface NavItem {
  label: string;
  path?: string;
  queryParams?: { [key: string]: string };
  icon?: string;
  image?: string;
  action?: () => void;
  children?: NavItem[];
  requiresAuth?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  description: string;
}

export interface BreadcrumbInfo {
  themeLabel: string;
  themeTab: string;
  workflowLabel: string;
}

@Component({
  selector: "app-navbar",
  imports: [
    CommonModule,
    NgIconComponent,
    RouterLink,
    DropdownMenuComponent,
    ButtonComponent,
  ],
  providers: [
    provideIcons({
      heroArrowRightEndOnRectangle,
      heroArrowRightStartOnRectangle,
      heroBars3,
      heroCalendarDays,
      heroChevronRight,
      heroClipboardDocumentList,
      heroHome,
      heroInformationCircle,
      heroQuestionMarkCircle,
      heroRectangleGroup,
      heroUser,
      heroUserCircle,
      heroXMark,
    }),
  ],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class Navbar implements AfterViewInit {
  private auth = inject(AuthService);
  private credits = inject(CreditsService);
  private router = inject(Router);
  private readonly profileUrl = environment.profileUrl;

  // Login state
  isAuthenticated$ = this.auth.isAuthenticated$;
  user$ = this.auth.user$;

  // Remaining credit balance fetched from GET /api/users/me/credit.
  // null while loading or when the balance is unavailable.
  creditsRemaining = signal<number | null>(null);
  readonly creditsEnabled = USER_CREDITS_ENABLED;
  readonly creditsTotal = TOTAL_CREDITS;
  creditsPercent = computed(() => {
    const remaining = this.creditsRemaining();
    if (remaining === null || this.creditsTotal <= 0) return 0;
    return Math.min(100, Math.max(0, (remaining / this.creditsTotal) * 100));
  });

  // Navbar state
  isMobileMenuOpen = signal(false);
  currentRoute = signal("");

  // User menu state
  userMenuOpen = signal(false);
  profileImageLoaded = signal(false);

  // Header/tabs state
  activeTab = signal("binder-design");
  showTabs = signal(false);
  showBreadcrumb = signal(false);
  breadcrumb = signal<BreadcrumbInfo | null>(null);

  private readonly workflowBreadcrumbs: Record<string, BreadcrumbInfo> =
    THEMES.reduce((acc, theme) => {
      for (const wf of theme.workflows) {
        acc[wf.href] = {
          themeLabel: theme.label,
          themeTab: theme.id,
          workflowLabel: wf.label,
        };
      }
      return acc;
    }, {} as Record<string, BreadcrumbInfo>);

  canScrollLeft = signal(false);
  canScrollRight = signal(false);

  @ViewChild("tabsContainer") tabsContainer!: ElementRef<HTMLElement>;

  tabs: TabItem[] = [
    {
      id: "binder-design",
      label: "Binder Design",
      description: "Design and optimize protein binders for specific targets",
    },
    {
      id: "structure-prediction",
      label: "Structure Prediction",
      description: "Predict protein structures using advanced algorithms",
    },
  ];

  navItems: NavItem[] = [
    {
      label: "Home",
      path: "/binder-design",
      icon: "heroHome",
      children: [
        {
          label: "Binder design",
          path: "/binder-design",
        },
        {
          label: "Structure prediction",
          path: "/structure-prediction",
          requiresAuth: false,
        },
      ],
    },
    {
      label: "Workflows",
      icon: "heroRectangleGroup",
      children: [
        {
          label: "De Novo Design",
          path: "/binder-design/de-novo-design",
        },
        {
          label: "Single Prediction",
          path: "/structure-prediction/single-prediction",
        },
        {
          label: "Bulk Prediction",
          path: "/structure-prediction/bulk-prediction",
        },
        {
          label: "Interaction Screening",
          path: "/structure-prediction/interaction-screening",
        },
      ],
    },
    {
      label: "Jobs",
      path: "/jobs",
      icon: "heroClipboardDocumentList",
    },
    {
      label: "About",
      path: "/about",
      icon: "heroInformationCircle",
    },
    {
      label: "Workshops & Events",
      path: "/events",
      icon: "heroCalendarDays",
    },
    {
      label: "Support / FAQ",
      path: "/support",
      icon: "heroQuestionMarkCircle",
    },
  ];

  constructor() {
    setTimeout(() => {
      this.checkRoute(this.router.url);
      this.updateRouteState();
    }, 0);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.url);
        this.updateRouteState();
      });

    /* istanbul ignore next: temporary feature flag branch is disabled in CI. */
    if (this.creditsEnabled) {
      // Load the remaining credit balance whenever the user is authenticated.
      this.isAuthenticated$
        .pipe(
          distinctUntilChanged(),
          switchMap((isAuthenticated) => {
            if (!isAuthenticated) {
              this.creditsRemaining.set(null);
              return of(null);
            }
            return this.credits.getMyCredit().pipe(
              catchError((error) => {
                console.warn("Failed to load credit balance", error);
                return of(null);
              })
            );
          })
        )
        .subscribe((response) => {
          this.creditsRemaining.set(response?.credit ?? null);
        });
    }

    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".compact-menu") &&
        !target.closest(".compact-menu-button")
      ) {
        if (this.isMobileMenuOpen()) {
          this.isMobileMenuOpen.set(false);
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isMobileMenuOpen()) {
        this.isMobileMenuOpen.set(false);
      }
    });
  }

  private checkRoute(url: string) {
    const basePath = url.split("?")[0];
    const isHomePage =
      basePath === "/binder-design" || basePath === "/structure-prediction";

    this.showTabs.set(isHomePage);

    if (isHomePage) {
      this.activeTab.set(basePath.slice(1));
      this.showBreadcrumb.set(false);
      this.breadcrumb.set(null);
    } else {
      const crumb = this.workflowBreadcrumbs[basePath] ?? null;
      this.showBreadcrumb.set(crumb !== null);
      this.breadcrumb.set(crumb);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateScrollState();
    }, 100);
  }

  // Auth methods

  login() {
    this.auth.login(this.router.url);
  }

  logout() {
    this.auth.logout();
  }

  openProfile() {
    window.open(this.profileUrl, "_blank", "noopener,noreferrer");
  }

  // Navbar methods

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((open) => !open);
  }

  navigate(path: string, queryParams?: { [key: string]: string }) {
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

    if (this.currentRoute() !== item.path) return false;

    if (!item.queryParams) return true;

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

    return item.children.some((child) => this.isNavItemActive(child));
  }

  private updateRouteState(): void {
    this.currentRoute.set(this.router.url.split("?")[0]);
  }

  // Header tab methods

  selectTab(tabId: string) {
    this.activeTab.set(tabId);
    this.router.navigate(["/" + tabId]);
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTab() === tabId;
  }

  navigateToTheme(themeTab: string): void {
    this.router.navigate(["/" + themeTab]);
  }

  scrollLeft(): void {
    const container = this.tabsContainer?.nativeElement;
    if (container) {
      container.scrollBy({ left: -200, behavior: "smooth" });
    }
  }

  scrollRight(): void {
    const container = this.tabsContainer?.nativeElement;
    if (container) {
      container.scrollBy({ left: 200, behavior: "smooth" });
    }
  }

  onScroll(): void {
    this.updateScrollState();
  }

  private updateScrollState(): void {
    const container = this.tabsContainer?.nativeElement;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    this.canScrollLeft.set(scrollLeft > 0);
    this.canScrollRight.set(scrollLeft < scrollWidth - clientWidth - 1);
  }
}
