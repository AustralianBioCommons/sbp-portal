import { Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';

interface LogoutParams {
  logoutParams?: {
    returnTo?: string;
  };
}

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

  logout() {
    try {
      // Type assertion to access logout with parameters
      (this.auth.logout as (options?: LogoutParams) => void)({ logoutParams: { returnTo: window.location.origin } });
    } catch (e) {
      // Fallback: call without params
      this.auth.logout();
    }
  }

  // Login method that first clears auth state to prevent previous login errors
  login() {
    try {
      // First logout to clear any partial auth state
      this.auth.logout().subscribe({
        complete: () => {
          // After logout completes, start fresh login
          setTimeout(() => {
            this.auth.loginWithRedirect();
          }, 100);
        },
        error: () => {
          // If logout fails, still attempt login
          this.auth.loginWithRedirect();
        }
      });
    } catch (e) {
      // If logout method fails, fall back to direct login
      this.auth.loginWithRedirect();
    }
  }
}
