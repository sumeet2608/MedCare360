import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-appointment-form', templateUrl: './appointment-form.component.html' })
export class AppointmentFormComponent implements OnInit {
  form!: FormGroup;
  doctors: any[] = [];
  patients: any[] = [];
  availableSlots: string[] = [];
  saving = false;
  today = new Date();
  types = ['consultation','follow_up','emergency','routine','specialist'];

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      patient: ['', Validators.required],
      doctor: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      type: ['consultation', Validators.required],
      reason: [''],
      symptoms: [''],
      notes: ['']
    });
    this.loadDoctors();
    this.loadPatients();
    this.form.get('doctor')?.valueChanges.subscribe(() => this.fetchSlots());
    this.form.get('appointmentDate')?.valueChanges.subscribe(() => this.fetchSlots());
  }

  loadDoctors(): void {
    this.http.get<any>(`${environment.apiUrl}/doctors?status=active`).subscribe({ next: r => this.doctors = r.data });
  }

  loadPatients(): void {
    this.http.get<any>(`${environment.apiUrl}/patients?limit=100`).subscribe({ next: r => this.patients = r.data });
  }

  fetchSlots(): void {
    const doctorId = this.form.get('doctor')?.value;
    const date = this.form.get('appointmentDate')?.value;
    if (!doctorId || !date) return;
    const d = new Date(date).toISOString().split('T')[0];
    this.http.get<any>(`${environment.apiUrl}/doctors/${doctorId}/availability?date=${d}`).subscribe({
      next: r => { this.availableSlots = r.available ? r.slots : []; },
      error: () => { this.availableSlots = []; }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    const payload = { ...v, symptoms: v.symptoms ? v.symptoms.split(',').map((s: string) => s.trim()) : [] };
    this.http.post(`${environment.apiUrl}/appointments`, payload).subscribe({
      next: () => { this.snack.open('Appointment booked!', 'Close', { duration: 3000 }); this.router.navigate(['/appointments']); },
      error: (err) => { this.saving = false; this.snack.open(err.error?.message || 'Booking failed', 'Close', { duration: 4000 }); }
    });
  }
}
