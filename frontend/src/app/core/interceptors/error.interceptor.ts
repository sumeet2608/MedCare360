import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        // Network error (status 0) — retry once after 1s
        if (err.status === 0) {
          return timer(1000).pipe(switchMap(() => next.handle(req)));
        }
        // 401 — token expired, force logout
        if (err.status === 401 && !req.url.includes('/auth/login')) {
          this.auth.logout();
          this.router.navigate(['/auth/login']);
        }
        // 403 — forbidden, redirect to dashboard
        if (err.status === 403) {
          this.router.navigate(['/dashboard']);
        }
        return throwError(() => err);
      })
    );
  }
}
