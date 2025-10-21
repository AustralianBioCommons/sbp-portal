import { Component, inject, signal } from '@angular/core';
import { AuthService } from './cores/auth.service';
import { CommonModule } from '@angular/common';
import { AlertComponent } from './components/alert/alert.component';
import { ButtonComponent } from './components/button/button.component';
import { DialogComponent } from './components/dialog/dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AlertComponent, ButtonComponent, DialogComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public auth = inject(AuthService);
  public locationHref = window.location.href;
  
  // Use AuthService unified banner observables
  public bannerMessage$ = this.auth.bannerMessage$;
  public bannerType$ = this.auth.bannerType$;
  public showBanner$ = this.auth.showBanner$;

  // Dialog state
  public showLogoutDialog = signal(false);

  dismissError() {
    this.auth.dismissError();
  }

  login() {
    this.auth.login();
  }

  logout() {
    this.showLogoutDialog.set(true);
  }

  onLogoutConfirmed() {
    this.auth.logout();
  }

  onLogoutCancelled() {
    // Dialog will be closed via the (closed) event
  }
}
