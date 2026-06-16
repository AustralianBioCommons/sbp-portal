import { Component, OnInit, inject } from "@angular/core";
import { AuthService } from "../../cores/auth.service";

@Component({
  selector: "app-login-redirect",
  templateUrl: "./login-redirect.component.html",
  styleUrl: "./login-redirect.component.scss",
})
export class LoginRedirectComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.login();
  }
}
