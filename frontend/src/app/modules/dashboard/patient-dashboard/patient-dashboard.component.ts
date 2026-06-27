import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-patient-dashboard', templateUrl: './patient-dashboard.component.html' })
export class PatientDashboardComponent implements OnInit {
  appointments: any[] = [];
  billings: any[] = [];
  loading = true;

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit(): void {
    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/appointments?limit=5`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/billing?limit=5`).toPromise()
    ]).then(([apts, bills]) => {
      this.appointments = apts?.data || [];
      this.billings = bills?.data || [];
      this.loading = false;
    }).catch(() => { this.loading = false; });
  }
}
