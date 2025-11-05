import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "../../cores/auth.service";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroUser,
  heroArrowRightOnRectangle,
} from "@ng-icons/heroicons/outline";

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

  // Expose auth observables
  isAuthenticated$ = this.auth.isAuthenticated$;
  user$ = this.auth.user$;

  login() {
    this.auth.login();
  }

  logout() {
    this.auth.logout();
  }

  navigate(path: string) {
    console.log("Navigate to:", path);
  }
}
