import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-patient-detail', templateUrl: './patient-detail.component.html' })
export class PatientDetailComponent implements OnInit {
  patient: any = null;
  loading = true;
  activeTab = 0;
  discharging = false;
  archiving = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.http.get<any>(`${environment.apiUrl}/patients/${id}`).subscribe({
      next: res => { this.patient = res.data; this.loading = false; },
      error: () => { this.loading = false; this.router.navigate(['/patients']); }
    });
  }

  get age(): number {
    if (!this.patient?.dateOfBirth) return 0;
    return Math.floor((Date.now() - new Date(this.patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  dischargePatient(): void {
    if (!confirm(`Discharge ${this.patient.user?.firstName} ${this.patient.user?.lastName}? This will mark them as outpatient and clear their bed assignment.`)) return;
    this.discharging = true;
    this.http.put<any>(`${environment.apiUrl}/patients/${this.patient._id}/discharge`, {}).subscribe({
      next: res => {
        this.patient = { ...this.patient, ...res.data, isAdmitted: false, dischargeDate: new Date() };
        this.discharging = false;
        this.snack.open(`${this.patient.user?.firstName} discharged successfully`, 'Close', { duration: 3000, panelClass: 'success-snack' });
      },
      error: err => {
        this.discharging = false;
        this.snack.open(err.error?.message || 'Discharge failed', 'Close', { duration: 3000 });
      }
    });
  }

  archivePatient(): void {
    const name = `${this.patient.user?.firstName} ${this.patient.user?.lastName}`;
    if (!confirm(`Archive & Clear "${name}"?\n\nThis will:\n• Fully discharge the patient\n• Remove them from all active patient lists\n• Their medical records are preserved\n\nTo restore: contact admin.`)) return;
    this.archiving = true;
    this.http.patch<any>(`${environment.apiUrl}/admin/patients/${this.patient._id}/archive`, {
      reason: 'Fully discharged and archived by admin'
    }).subscribe({
      next: res => {
        this.patient = { ...this.patient, ...res.data };
        this.archiving = false;
        this.snack.open(`${name} archived and cleared from active lists`, 'Close', { duration: 3500, panelClass: 'success-snack' });
      },
      error: err => {
        this.archiving = false;
        this.snack.open(err.error?.message || 'Archive failed', 'Close', { duration: 3000 });
      }
    });
  }

  admitPatient(): void {
    if (!confirm(`Admit ${this.patient.user?.firstName} ${this.patient.user?.lastName}?`)) return;
    this.http.put<any>(`${environment.apiUrl}/patients/${this.patient._id}/admit`, {}).subscribe({
      next: res => {
        this.patient = { ...this.patient, ...res.data, isAdmitted: true };
        this.snack.open('Patient admitted', 'Close', { duration: 2000, panelClass: 'success-snack' });
      },
      error: err => this.snack.open(err.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }
}
