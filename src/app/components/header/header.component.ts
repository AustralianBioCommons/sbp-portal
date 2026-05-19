import { CommonModule } from "@angular/common";
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from "@angular/core";
import { NavigationEnd, Router, RouterModule } from "@angular/router";
import { filter } from "rxjs/operators";
import { THEMES } from "../../cores/config/themes.config";
import { Login } from "../login/login.component";
import { Navbar } from "../navbar/navbar.component";

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
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Login],
  templateUrl: "./header.component.html",
})
export class Header implements AfterViewInit {
  private router = inject(Router);

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

  // Scroll state
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

  constructor() {
    // Check current route immediately and listen for route changes
    setTimeout(() => {
      this.checkRoute(this.router.url);
    }, 0);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.url);
      });
  }

  private checkRoute(url: string) {
    const basePath = url.split("?")[0];

    this.showTabs.set(basePath === "/themes");

    if (basePath === "/themes") {
      const urlTree = this.router.parseUrl(url);
      const tab = urlTree.queryParams["tab"];
      this.activeTab.set(tab ?? "binder-design");
      this.showBreadcrumb.set(false);
      this.breadcrumb.set(null);
    } else {
      const crumb = this.workflowBreadcrumbs[basePath] ?? null;
      this.showBreadcrumb.set(crumb !== null);
      this.breadcrumb.set(crumb);
    }
  }

  ngAfterViewInit() {
    // Check scroll state after view init
    setTimeout(() => {
      this.updateScrollState();
    }, 100);
  }

  selectTab(tabId: string) {
    this.activeTab.set(tabId);
    this.router.navigate(["/themes"], { queryParams: { tab: tabId } });
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTab() === tabId;
  }

  navigateToTheme(themeTab: string): void {
    this.router.navigate(["/themes"], { queryParams: { tab: themeTab } });
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
