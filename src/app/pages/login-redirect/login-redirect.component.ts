import { Component, OnInit, inject } from "@angular/core";
import { AuthService } from "../../cores/auth.service";

@Component({
  selector: "app-login-redirect",
  standalone: true,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-bg-primary p-8 text-center text-text-primary">
      <div>
        <p class="text-lg font-semibold">Redirecting you to the Structural Biology Platform login…</p>
        <p class="mt-2 text-sm text-gray-500">If this page stays here, please refresh to try again.</p>
      </div>
    </div>
  `,
})
export class LoginRedirectComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.login();
  }
}
