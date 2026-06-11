import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AlertComponent } from "./components/alert/alert.component";
import { DialogComponent } from "./components/dialog/dialog.component";
import { FooterSectionsComponent } from "./components/footer/footer.component";
import { Navbar } from "./components/navbar/navbar.component";
import { LoadingComponent } from "./components/loading/loading.component";
import { AuthService } from "./cores/auth.service";

@Component({
  selector: "app-root",
  imports: [
    CommonModule,
    RouterOutlet,
    AlertComponent,
    DialogComponent,
    Navbar,
    FooterSectionsComponent,
    LoadingComponent,
  ],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  public auth = inject(AuthService);
  public locationHref = window.location.href;

  // Use AuthService unified banner observables
  public bannerMessage$ = this.auth.bannerMessage$;
  public bannerType$ = this.auth.bannerType$;
  public showBanner$ = this.auth.showBanner$;

  // Loading observables
  public isLoading$ = this.auth.isLoading$;
  public loadingMessage$ = this.auth.loadingMessage$;

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
