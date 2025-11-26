import { inject } from "@angular/core";
import { CanActivateFn } from "@angular/router";
import { AuthService } from "@auth0/auth0-angular";
import { map } from "rxjs/operators";

// Guard that checks authentication and redirects to login using appState
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  return auth.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;
      auth.loginWithRedirect({ appState: { target: state.url } });
      return false;
    })
  );
};
