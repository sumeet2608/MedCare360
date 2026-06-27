import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { GridColumn } from '../../../shared/components/data-grid/data-grid.component';

@Component({ selector: 'app-appointment-list', templateUrl: './appointment-list.component.html' })
export class AppointmentListComponent implements OnInit {
  appointments: any[] = [];
  loading = true; total = 0;
  statusFilter = '';
  statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

  columns: GridColumn[] = [
    { key: 'appointmentId', label: 'ID' },
    { key: 'patientName', label: 'Patient', sortable: true },
    { key: 'doctorName', label: 'Doctor', sortable: true },
    { key: 'appointmentDate', label: 'Date', type: 'date', sortable: true },
    { key: 'appointmentTime', label: 'Time' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'consultationFee', label: 'Fee', type: 'currency', sortable: true },
    { key: 'actions', label: 'Actions' },
  ];

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params = this.statusFilter ? `?status=${this.statusFilter}` : '';
    this.http.get<any>(`${environment.apiUrl}/appointments${params}`).subscribe({
      next: res => {
        this.appointments = (res.data || []).map((a: any) => ({
          ...a,
          patientName: `${a.patient?.user?.firstName || ''} ${a.patient?.user?.lastName || ''}`.trim(),
          doctorName: `Dr. ${a.doctor?.user?.firstName || ''} ${a.doctor?.user?.lastName || ''}`.trim()
        }));
        this.total = res.total;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  updateStatus(id: string, status: string): void {
    this.http.put(`${environment.apiUrl}/appointments/${id}`, { status }).subscribe({
      next: () => { this.snack.open('Status updated', 'Close', { duration: 2000 }); this.load(); },
      error: () => { this.snack.open('Update failed', 'Close', { duration: 3000 }); }
    });
  }

  cancel(id: string): void {
    if (!confirm('Cancel this appointment?')) return;
    this.http.put(`${environment.apiUrl}/appointments/${id}/cancel`, { reason: 'Cancelled by staff' }).subscribe({
      next: () => { this.snack.open('Appointment cancelled', 'Close', { duration: 2000 }); this.load(); }
    });
  }

  countByStatus(status: string): number {
    return this.appointments.filter(a => a.status === status).length;
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = { scheduled: 'pending', confirmed: 'active', completed: 'completed', cancelled: 'cancelled', in_progress: 'active', no_show: 'cancelled' };
    return m[s] || 'pending';
  }
}
