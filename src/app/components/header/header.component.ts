import { Component, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { Navbar } from "../navbar/navbar.component";
import { Login } from "../login/login.component";

export interface TabItem {
  id: string;
  label: string;
  description: string;
}

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Login],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
})
export class Header {
  private router = inject(Router);

  activeTab = signal("binder-design");
  showTabs = signal(false);

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
    {
      id: "structure-search",
      label: "Structure Search",
      description: "Search and compare protein structures in databases",
    },
    {
      id: "tools",
      label: "Tools",
      description: "Access various computational biology tools and utilities",
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
    this.showTabs.set(url.startsWith("/themes"));

    // Extract tab from query parameters when on themes route
    if (url.startsWith("/themes")) {
      const urlTree = this.router.parseUrl(url);
      const tab = urlTree.queryParams["tab"];
      if (tab) {
        this.activeTab.set(tab);
        console.log("Header: Updated active tab to:", tab);
      } else {
        // Default to binder-design if no tab specified
        this.activeTab.set("binder-design");
        console.log("Header: No tab specified, defaulting to binder-design");
      }
    }
  }

  selectTab(tabId: string) {
    this.activeTab.set(tabId);
    // Navigate to themes route with query param or use a service to communicate with home component
    // if the tab is tools, navigate to /tools directly
    if (tabId === "tools") {
      this.router.navigate(["/tools"]);
      return;
    }
    this.router.navigate(["/themes"], { queryParams: { tab: tabId } });
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTab() === tabId;
  }
}
