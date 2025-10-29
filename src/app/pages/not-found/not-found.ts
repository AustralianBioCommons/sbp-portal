import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroHome, heroArrowLeft, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, NgIconComponent, RouterModule],
  providers: [provideIcons({ heroHome, heroArrowLeft, heroMagnifyingGlass })],
  templateUrl: './not-found.html',
  styleUrls: ['./not-found.scss']
})
export class NotFoundComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/themes']);
  }

  goBack() {
    window.history.back();
  }

  searchResources() {
    // Navigate to themes with focus on search
    this.router.navigate(['/themes'], { queryParams: { search: 'true' } });
  }

  navigateToBinderDesign() {
    this.router.navigate(['/themes'], { queryParams: { tab: 'binder-design' } });
  }

  navigateToStructurePrediction() {
    this.router.navigate(['/themes'], { queryParams: { tab: 'structure-prediction' } });
  }

  navigateToStructureSearch() {
    this.router.navigate(['/themes'], { queryParams: { tab: 'structure-search' } });
  }

  navigateToSingleStructurePrediction() {
    this.router.navigate(['/single-structure-prediction']);
  }
}