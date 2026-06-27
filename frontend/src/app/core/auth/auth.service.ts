import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private readonly TOKEN_KEY = 'medcare_token';
  private readonly USER_KEY = 'medcare_user';

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = localStorage.getItem(this.USER_KEY);
    if (token && user) {
      try {
        this.currentUserSubject.next(JSON.parse(user));
      } catch { this.clearStorage(); }
    }
  }

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get token(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
  get isAuthenticated(): boolean { return !!this.token && !!this.currentUser; }
  get userRole(): string { return this.currentUser?.role || ''; }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.userRole);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  logout(): void {
    // Capture token before clearStorage() wipes it — the interceptor reads
    // this.auth.token synchronously when the request is cloned, so the token
    // must still be present in localStorage at that point.
    const token = this.token;
    this.clearStorage();
    if (token) {
      // Fire-and-forget: best-effort server-side session invalidation.
      // Pass the token manually because clearStorage() already removed it
      // from localStorage, so the interceptor would find null otherwise.
      this.http.post(
        `${environment.apiUrl}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({ error: () => {} });
    }
    this.router.navigate(['/auth/login']);
  }

  getMe(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/me`).pipe(
      tap((res: any) => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/reset-password/${token}`, { password });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword });
  }

  getDashboardRoute(): string {
    const roleRoutes: Record<string, string> = {
      super_admin: '/dashboard/admin',
      hospital_admin: '/dashboard/admin',
      doctor: '/dashboard/doctor',
      patient: '/dashboard/patient',
      nurse: '/dashboard/admin',
      receptionist: '/dashboard/admin',
      pharmacist: '/pharmacy',
      lab_technician: '/lab',
      ambulance_staff: '/ambulance'
    };
    return roleRoutes[this.userRole] || '/dashboard/admin';
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }
}
