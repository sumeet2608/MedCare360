import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    return this.checkAuth(route);
  }

  canActivateChild(route: ActivatedRouteSnapshot): boolean {
    return this.checkAuth(route);
  }

  private checkAuth(route: ActivatedRouteSnapshot): boolean {
    if (!this.auth.isAuthenticated) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    const requiredRoles: string[] = route.data['roles'];
    if (requiredRoles && requiredRoles.length > 0) {
      if (!this.auth.hasRole(...requiredRoles)) {
        this.router.navigate([this.auth.getDashboardRoute()]);
        return false;
      }
    }

    return true;
  }
}
