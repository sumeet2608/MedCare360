import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ambulance',
  templateUrl: './ambulance.component.html',
  styleUrls: ['./ambulance.component.scss']
})
export class AmbulanceComponent implements OnInit {
  ambulances: any[] = [];
  loading = true;
  showRegisterForm = false;

  registerForm!: FormGroup;
  registering = false;

  dispatchForm: Record<string, { pickup: string; dest: string; emergency: string }> = {};

  vehicleTypes = ['basic', 'advanced', 'neonatal', 'cardiac', 'bariatric'];
  emergencyTypes = ['cardiac arrest', 'trauma', 'stroke', 'accident', 'respiratory distress', 'other'];

  constructor(
    private http: HttpClient,
    private snack: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.load();
  }

  buildForm(): void {
    this.registerForm = this.fb.group({
      vehicleNumber: ['MH-12-AB-0001', Validators.required],
      type: ['advanced', Validators.required],
      model: ['Toyota HiAce'],
      year: [2023],
      equipment: ['Defibrillator, Oxygen, Stretcher, IV Kit'],
    });
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/ambulance`).subscribe({
      next: res => { this.ambulances = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  registerAmbulance(): void {
    if (this.registerForm.invalid) return;
    this.registering = true;
    const payload = {
      ...this.registerForm.value,
      equipment: this.registerForm.value.equipment.split(',').map((s: string) => s.trim()).filter(Boolean),
      status: 'available',
      location: { address: 'Hospital Base Station', coordinates: { lat: 18.5204, lng: 73.8567 } }
    };
    this.http.post(`${environment.apiUrl}/ambulance`, payload).subscribe({
      next: () => {
        this.snack.open('Ambulance registered!', 'Close', { duration: 3000 });
        this.showRegisterForm = false;
        this.registering = false;
        this.buildForm();
        this.load();
      },
      error: (err) => {
        this.snack.open(err.error?.message || 'Registration failed', 'Close', { duration: 3000 });
        this.registering = false;
      }
    });
  }

  openDispatch(amb: any): void {
    if (!this.dispatchForm[amb._id]) {
      this.dispatchForm[amb._id] = { pickup: '', dest: 'MedCare 360 Hospital', emergency: 'other' };
    }
    amb._dispatchOpen = !amb._dispatchOpen;
  }

  dispatch(amb: any): void {
    const d = this.dispatchForm[amb._id];
    if (!d?.pickup) { this.snack.open('Enter pickup address', '', { duration: 2000 }); return; }
    this.http.patch(`${environment.apiUrl}/ambulance/${amb._id}/dispatch`, {
      pickupAddress: d.pickup,
      destinationAddress: d.dest,
      emergency: d.emergency
    }).subscribe({
      next: () => {
        this.snack.open('Ambulance dispatched!', 'Close', { duration: 3000, panelClass: ['snack-success'] });
        amb._dispatchOpen = false;
        this.load();
      },
      error: (err) => this.snack.open(err.error?.message || 'Dispatch failed', 'Close', { duration: 3000 })
    });
  }

  complete(id: string): void {
    this.http.patch(`${environment.apiUrl}/ambulance/${id}/complete`, {}).subscribe({
      next: () => { this.snack.open('Dispatch completed', '', { duration: 2000 }); this.load(); }
    });
  }

  setMaintenance(id: string): void {
    this.http.put(`${environment.apiUrl}/ambulance/${id}`, { status: 'maintenance' }).subscribe({
      next: () => { this.snack.open('Marked for maintenance', '', { duration: 2000 }); this.load(); }
    });
  }

  deleteAmbulance(id: string, vehicleNumber: string): void {
    if (!confirm(`Delete ambulance ${vehicleNumber}? This cannot be undone.`)) return;
    this.http.delete(`${environment.apiUrl}/ambulance/${id}`).subscribe({
      next: () => { this.snack.open('Ambulance deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (err) => this.snack.open(err.error?.message || 'Delete failed', 'Close', { duration: 3000 })
    });
  }

  countByStatus(s: string): number { return this.ambulances.filter(a => a.status === s).length; }

  statusColor(s: string): string {
    return ({ available: '#059669', dispatched: '#d97706', maintenance: '#dc2626', offline: '#6b7280' } as any)[s] || '#6b7280';
  }

  statusBg(s: string): string {
    return ({ available: '#d1fae5', dispatched: '#fef3c7', maintenance: '#fee2e2', offline: '#f3f4f6' } as any)[s] || '#f3f4f6';
  }
}
