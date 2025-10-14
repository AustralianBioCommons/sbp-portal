import { Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-100 p-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold">SBP Portal</h1>
        <button (click)="auth.loginWithRedirect()" class="px-4 py-2 bg-blue-600 text-white rounded">Log in</button>
      </div>
      <p class="mt-4 text-center">Welcome to the Structural Biology Platform portal.</p>
    </div>
  `,
  styles: []
})
export class AppComponent {
  public auth = inject(AuthService);
}
