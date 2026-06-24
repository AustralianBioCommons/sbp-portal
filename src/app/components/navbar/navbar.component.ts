import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
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
import { distinctUntilChanged, filter } from "rxjs";
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
import { TooltipComponent } from "../tooltip/tooltip.component";

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
    TooltipComponent,
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
  host: { class: "contents" },
})
export class Navbar {
  private auth = inject(AuthService);
  private credits = inject(CreditsService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileUrl = environment.profileUrl;

  private readonly topSentinel =
    viewChild<ElementRef<HTMLElement>>("topSentinel");
  private scrollObserver?: IntersectionObserver;

  // Login state
  isAuthenticated$ = this.auth.isAuthenticated$;
  user$ = this.auth.user$;

  // Shared remaining credit balance (kept current by the CreditsService via
  // getMyCredit()/refreshBalance()). null while loading or unavailable.
  readonly creditsRemaining = this.credits.balance;
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

  // Header/breadcrumb state
  showBreadcrumb = signal(false);
  breadcrumb = signal<BreadcrumbInfo | null>(null);
  scrolled = signal(false);

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
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.url);
        this.updateRouteState();
      });

    if (this.creditsEnabled) {
      // Keep the shared balance current with the auth state: refresh it on
      // login, clear it on logout.
      this.isAuthenticated$
        .pipe(distinctUntilChanged())
        .subscribe((isAuthenticated) => {
          if (isAuthenticated) {
            this.credits.refreshBalance();
          } else {
            this.credits.clearBalance();
          }
        });
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".compact-menu") &&
        !target.closest(".compact-menu-button")
      ) {
        if (this.isMobileMenuOpen()) {
          this.isMobileMenuOpen.set(false);
        }
      }
    };

    const onDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && this.isMobileMenuOpen()) {
        this.isMobileMenuOpen.set(false);
      }
    };

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onDocumentKeydown);
      this.scrollObserver?.disconnect();
    });

    afterNextRender(() => {
      this.checkRoute(this.router.url);
      this.updateRouteState();

      const sentinel = this.topSentinel()?.nativeElement;
      if (sentinel) {
        this.scrollObserver = new IntersectionObserver(([entry]) =>
          this.scrolled.set(!entry.isIntersecting)
        );
        this.scrollObserver.observe(sentinel);
      }
    });
  }

  private checkRoute(url: string) {
    const basePath = url.split("?")[0];
    const isHomePage =
      basePath === "/binder-design" || basePath === "/structure-prediction";

    if (isHomePage) {
      this.showBreadcrumb.set(false);
      this.breadcrumb.set(null);
    } else {
      const crumb = this.workflowBreadcrumbs[basePath] ?? null;
      this.showBreadcrumb.set(crumb !== null);
      this.breadcrumb.set(crumb);
    }
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
}
