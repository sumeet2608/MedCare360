import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private loggingOut = false;

  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;

    // Login/register/password-reset never need a token — sending a stale one
    // causes the server to reject the request before checking credentials.
    const isCredentialUrl = req.url.includes('/auth/login') ||
                            req.url.includes('/auth/register') ||
                            req.url.includes('/auth/forgot-password') ||
                            req.url.includes('/auth/reset-password');

    // Logout needs the token (server uses it to invalidate the session), but a
    // 401 from logout must NOT trigger another logout call — that's the loop.
    const isLogoutUrl = req.url.includes('/auth/logout');

    let request = req;
    if (token && !isCredentialUrl) {
      request = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request).pipe(
      catchError((err: HttpErrorResponse) => {
        const isAuthUrl = isCredentialUrl || isLogoutUrl;
        // Only trigger logout for 401s on protected endpoints.
        // Auth-endpoint 401s (bad password, already-cleared token on logout, etc.)
        // must bubble to the component; never cascade into a logout loop.
        if (err.status === 401 && !isAuthUrl && !this.loggingOut) {
          this.loggingOut = true;
          this.auth.logout();
          setTimeout(() => { this.loggingOut = false; }, 2000);
        }
        return throwError(() => err);
      })
    );
  }
}
