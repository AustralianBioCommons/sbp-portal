// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      { path: '', component: AppComponent },
      // add routes here if needed
    ]),
    // provideHttpClient(), provideAnimations(), etc. as needed
  ],
}).catch((err) => console.error(err));
