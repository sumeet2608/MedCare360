import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  total?: number;
  count?: number;
  pages?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  private handleError(err: any, silent = false): Observable<never> {
    if (!silent) {
      const msg = err?.error?.message || err?.message || 'Something went wrong. Please try again.';
      this.snack.open(msg, 'Close', { duration: 4000, panelClass: 'error-snack' });
    }
    return throwError(() => err);
  }

  private success(msg: string): void {
    this.snack.open(msg, '', { duration: 2000, panelClass: 'success-snack' });
  }

  // ── Generic CRUD ──────────────────────────────────────────────────────────

  get<T = any>(path: string, params?: Record<string, any>, silent = false): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, String(v)); });
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params: httpParams })
      .pipe(catchError(e => this.handleError(e, silent)));
  }

  post<T = any>(path: string, body: any, successMsg?: string): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body).pipe(
      tap(() => { if (successMsg) this.success(successMsg); }),
      catchError(e => this.handleError(e))
    );
  }

  put<T = any>(path: string, body: any, successMsg?: string): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body).pipe(
      tap(() => { if (successMsg) this.success(successMsg); }),
      catchError(e => this.handleError(e))
    );
  }

  patch<T = any>(path: string, body: any, successMsg?: string): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.base}${path}`, body).pipe(
      tap(() => { if (successMsg) this.success(successMsg); }),
      catchError(e => this.handleError(e))
    );
  }

  delete<T = any>(path: string, successMsg?: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.base}${path}`).pipe(
      tap(() => { if (successMsg) this.success(successMsg); }),
      catchError(e => this.handleError(e))
    );
  }

  // ── Domain-specific helpers ───────────────────────────────────────────────

  getPatients(params?: Record<string, any>)     { return this.get('/patients', params); }
  getDoctors(params?: Record<string, any>)      { return this.get('/doctors', params); }
  getAppointments(params?: Record<string, any>) { return this.get('/appointments', params); }
  getBillings(params?: Record<string, any>)     { return this.get('/billing', params); }
  getBillingStats()                             { return this.get('/billing/stats', {}, true); }
  getLabTests(params?: Record<string, any>)     { return this.get('/lab', params); }
  getAnalytics()                                { return this.get('/analytics/dashboard', {}, true); }

  searchICD10(q: string)  { return this.get('/emr/icd10/search', { q }); }
  getTimeline(patientId: string) { return this.get(`/emr/timeline/${patientId}`, {}, true); }
}
