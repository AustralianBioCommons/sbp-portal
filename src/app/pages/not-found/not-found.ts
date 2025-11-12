import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowLeft,
  heroHome,
  heroMagnifyingGlass,
} from "@ng-icons/heroicons/outline";
import { ButtonComponent } from "src/app/components/button/button.component";

@Component({
  selector: "app-not-found",
  standalone: true,
  imports: [CommonModule, NgIconComponent, ButtonComponent, RouterModule],
  providers: [provideIcons({ heroHome, heroArrowLeft, heroMagnifyingGlass })],
  templateUrl: "./not-found.html",
  styleUrls: ["./not-found.scss"],
})
export class NotFoundComponent {
  private router = inject(Router);

  goHome() {
    this.router.navigate(["/themes"]);
  }

  goBack() {
    window.history.back();
  }

  searchResources() {
    // Navigate to themes with focus on search
    this.router.navigate(["/themes"], { queryParams: { search: "true" } });
  }

  navigateToBinderDesign() {
    this.router.navigate(["/themes"], {
      queryParams: { tab: "binder-design" },
    });
  }

  navigateToStructurePrediction() {
    this.router.navigate(["/themes"], {
      queryParams: { tab: "structure-prediction" },
    });
  }

  navigateToStructureSearch() {
    this.router.navigate(["/themes"], {
      queryParams: { tab: "structure-search" },
    });
  }

  navigateToSingleStructurePrediction() {
    this.router.navigate(["/single-structure-prediction"]);
  }
}
