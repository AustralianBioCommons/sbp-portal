import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowRightOnRectangle,
  heroUser,
} from "@ng-icons/heroicons/outline";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../cores/services/auth.service";

@Component({
  selector: "app-login",
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroUser,
      heroArrowRightOnRectangle,
    }),
  ],
  templateUrl: "./login.html",
  styleUrl: "./login.scss",
})
export class Login {
  private auth = inject(AuthService);
  private readonly profileUrl = environment.profileUrl;

  // Expose auth observables
  isAuthenticated$ = this.auth.isAuthenticated$;
  user$ = this.auth.user$;

  login() {
    this.auth.login();
  }

  logout() {
    this.auth.logout();
  }

  openProfile() {
    window.open(this.profileUrl, "_self");
  }
}
