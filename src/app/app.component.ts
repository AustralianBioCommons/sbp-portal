import { Component, inject, signal } from "@angular/core";
import { AuthService } from "./cores/auth.service";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { AlertComponent } from "./components/alert/alert.component";
import { DialogComponent } from "./components/dialog/dialog.component";
import { Header } from "./components/header/header.component";
import { FooterSectionsComponent } from "./components/footer/footer.component";
import { LoadingComponent } from "./components/loading/loading.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AlertComponent,
    DialogComponent,
    Header,
    FooterSectionsComponent,
    LoadingComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
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

  onSearch(searchTerm: string) {
    // Handle search functionality
    console.log("Search term:", searchTerm);
    // TODO: Implement actual search functionality
  }
}
