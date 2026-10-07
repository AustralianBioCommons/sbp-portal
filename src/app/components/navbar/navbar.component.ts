import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from "@angular/core";
import { CdkTrapFocus } from "@angular/cdk/a11y";
import { CommonModule } from "@angular/common";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowRightStartOnRectangle,
  heroBars3,
  heroChevronRight,
  heroInformationCircle,
  heroUser,
  heroUserCircle,
  heroXMark,
} from "@ng-icons/heroicons/outline";
import { distinctUntilChanged, filter } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../core/services/auth.service";
import {
  CreditsService,
  TOTAL_CREDITS,
  USER_CREDITS_ENABLED,
} from "../../core/services/credits.service";
import { THEMES } from "../../core/configs/themes.config";
import { DropdownMenuComponent } from "../dropdown-menu/dropdown-menu.component";
import { ButtonComponent } from "../button/button.component";
import { TooltipComponent } from "../tooltip/tooltip.component";

export interface NavItem {
  label: string;
  path: string;
  children?: NavItem[];
  menuOnly?: boolean;
  external?: boolean;
}

export interface BreadcrumbInfo {
  themeLabel: string;
  themeTab: string;
  workflowLabel: string;
}

@Component({
  selector: "app-navbar",
  imports: [
    CdkTrapFocus,
    CommonModule,
    NgIconComponent,
    RouterLink,
    DropdownMenuComponent,
    ButtonComponent,
    TooltipComponent,
  ],
  providers: [
    provideIcons({
      heroArrowRightStartOnRectangle,
      heroBars3,
      heroChevronRight,
      heroInformationCircle,
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
  private readonly injector = inject(Injector);
  private readonly profileUrl = environment.profileUrl;

  private readonly topSentinel =
    viewChild<ElementRef<HTMLElement>>("topSentinel");
  private scrollObserver?: IntersectionObserver;

  private readonly menuButton =
    viewChild<ElementRef<HTMLButtonElement>>("menuButton");
  private readonly closeMenuButton =
    viewChild<ElementRef<HTMLButtonElement>>("closeMenuButton");
  private readonly menuPanel = viewChild<ElementRef<HTMLElement>>("menuPanel");

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

  readonly navItems: NavItem[] = [
    ...THEMES.map((theme) => ({
      label: theme.label,
      path: `/${theme.id}`,
      children: theme.workflows
        .filter((wf) => !wf.disabled)
        .map((wf) => ({ label: wf.label, path: wf.href })),
    })),
    {
      label: "My Jobs",
      path: "/my-jobs",
    },
    {
      label: "Support",
      path: "https://biocommons-sbp-help.freshdesk.com/support/tickets/new",
      menuOnly: true,
      external: true,
    },
  ];

  readonly desktopNavItems = this.navItems.filter((item) => !item.menuOnly);

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
          this.closeMobileMenu();
        }
      }
    };

    const onDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && this.isMobileMenuOpen()) {
        this.closeMobileMenu();
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
    const crumb = this.workflowBreadcrumbs[url.split("?")[0]] ?? null;
    this.showBreadcrumb.set(crumb !== null);
    this.breadcrumb.set(crumb);
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
    if (this.isMobileMenuOpen()) {
      afterNextRender(() => this.closeMenuButton()?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  closeMobileMenu() {
    if (this.menuPanel()?.nativeElement.contains(document.activeElement)) {
      this.menuButton()?.nativeElement.focus();
    }
    this.isMobileMenuOpen.set(false);
  }

  isNavItemActive(item: NavItem): boolean {
    return this.currentRoute() === item.path;
  }

  private updateRouteState(): void {
    this.currentRoute.set(this.router.url.split("?")[0]);
  }
}
