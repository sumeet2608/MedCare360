import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-doctor-dashboard', templateUrl: './doctor-dashboard.component.html' })
export class DoctorDashboardComponent implements OnInit {
  todayAppointments: any[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/appointments/today`).subscribe({
      next: res => { this.todayAppointments = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get completedCount(): number {
    return this.todayAppointments.filter(a => a.status === 'completed').length;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = { scheduled: 'pending', confirmed: 'active', completed: 'completed', cancelled: 'cancelled', in_progress: 'active' };
    return map[status] || 'pending';
  }
}
