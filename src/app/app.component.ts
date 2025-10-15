import { Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public auth = inject(AuthService);
  public locationHref = window.location.href;

  constructor() {
    // Debug subscriptions
    try {
      this.auth.isAuthenticated$?.subscribe((v) => console.debug('Auth isAuthenticated$', v));
      this.auth.user$?.subscribe((u) => console.debug('Auth user$', u));
    } catch (e) {
      console.debug('Auth debug subscription failed', e);
    }
  }
  logout() {
    try {
      (this.auth as any).logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (e) {
      // Fallback: call without params
      this.auth.logout();
    }
  }
}
