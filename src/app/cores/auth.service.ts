import { Injectable, inject } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { BehaviorSubject, Observable } from 'rxjs';

interface AuthError {
  error?: string;
  message?: string;
  error_description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth0 = inject(Auth0Service);
  
  // Banner state
  private bannerMessageSubject = new BehaviorSubject<string | null>(null);
  private bannerTypeSubject = new BehaviorSubject<'success' | 'error' | null>(null);
  private showBannerSubject = new BehaviorSubject<boolean>(false);

  public bannerMessage$ = this.bannerMessageSubject.asObservable();
  public bannerType$ = this.bannerTypeSubject.asObservable();
  public showBanner$ = this.showBannerSubject.asObservable();

  // Keep legacy observables for backward compatibility
  public errorMessage$ = this.bannerMessageSubject.asObservable();
  public showErrorBanner$ = this.showBannerSubject.asObservable();

  // Expose Auth0 observables
  public isAuthenticated$ = this.auth0.isAuthenticated$;
  public user$ = this.auth0.user$;
  public error$ = this.auth0.error$;

  constructor() {
    // Banner handling
    this.initializeBannerHandling();
  }

  private initializeBannerHandling(): void {
    // Monitor authentication errors
    this.auth0.error$.subscribe(error => {
      if (error) {
        console.log('Auth error:', error);
        
        // Show error banner and logout after 3 seconds
        console.log('Authentication error detected - showing error and logging out');
        this.handleAuthError(error);
      } else {
        // Only clear banner when error is null AND it's currently showing an error banner
        if (this.bannerTypeSubject.value === 'error') {
          this.clearBanner();
        }
      }
    });

    // Monitor successful authentication
    this.auth0.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        // Show success banner only if there are no current errors
        this.auth0.error$.pipe().subscribe(currentError => {
          if (!currentError) {
            console.log('Authentication successful - showing success banner');
            this.showBanner('Login successful!', 'success');
          }
        });
      } else {
        // Clear banner when not authenticated (only if it's not an error banner being shown)
        if (this.bannerTypeSubject.value !== 'error') {
          this.clearBanner();
        }
      }
    });
  }

  /**
   * Handle authentication error by showing error banner and logout after 3 seconds
   */
  private handleAuthError(error: AuthError): void {
    // Extract and show error message immediately
    const errorMessage = error.message || error.error || error.error_description || 'An unexpected error occurred during authentication.';
    this.showBanner(errorMessage, 'error');
    
    // Logout to clear previous session after 3 seconds
    setTimeout(() => {
      this.auth0.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    }, 3000);
  }

  /**
   * Show banner message for 3 seconds
   */
  private showBanner(message: string, type: 'success' | 'error'): void {
    this.bannerMessageSubject.next(message);
    this.bannerTypeSubject.next(type);
    this.showBannerSubject.next(true);
    
    // Auto-hide banner after 3 seconds
    setTimeout(() => {
      this.clearBanner();
    }, 3000);
  }

  /**
   * Initiate login with Auth0 and clear any banners
   */
  login(): void {
    // Clear any banner when user clicks login
    this.clearBanner();
    this.auth0.loginWithRedirect();
  }

  /**
   * Logout from Auth0 and return to origin
   */
  logout(): void {
    this.clearBanner();
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  }

  /**
   * Dismiss the banner
   */
  dismissError(): void {
    this.clearBanner();
  }

  /**
   * Get current banner message
   */
  get currentBannerMessage(): string | null {
    return this.bannerMessageSubject.value;
  }

  /**
   * Get current banner type
   */
  get currentBannerType(): 'success' | 'error' | null {
    return this.bannerTypeSubject.value;
  }

  /**
   * Check if banner should be visible
   */
  get isBannerVisible(): boolean {
    return this.showBannerSubject.value;
  }

    /**
   * Clear current banner state
   */
  clearBanner(): void {
    this.bannerMessageSubject.next('');
    this.bannerTypeSubject.next(null); // Default type
    this.showBannerSubject.next(false);
  }

  /**
   * Get access token silently (delegated to Auth0)
   */
  getAccessTokenSilently(): Observable<string> {
    return this.auth0.getAccessTokenSilently();
  }


}