import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-doctor-form', templateUrl: './doctor-form.component.html' })
export class DoctorFormComponent implements OnInit {
  form!: FormGroup;
  loading = false; saving = false; isEdit = false; doctorId: string | null = null;
  specializations = ['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Oncology','Gynecology','Psychiatry','Radiology','General Medicine','ENT','Ophthalmology','Urology','Gastroenterology','Pulmonology','Endocrinology','Nephrology','Rheumatology','Anesthesiology','Emergency Medicine'];

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router, private route: ActivatedRoute, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', Validators.required], lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]], phone: [''],
      specialization: ['', Validators.required], licenseNumber: ['', Validators.required],
      experience: [0, [Validators.required, Validators.min(0)]],
      consultationFee: [0, Validators.min(0)], department: [''], bio: ['']
    });
    this.doctorId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.doctorId;
    if (this.isEdit && this.doctorId) {
      this.loading = true;
      this.http.get<any>(`${environment.apiUrl}/doctors/${this.doctorId}`).subscribe({
        next: res => {
          const d = res.data;
          this.form.patchValue({ firstName: d.user?.firstName, lastName: d.user?.lastName, email: d.user?.email, phone: d.user?.phone, specialization: d.specialization, licenseNumber: d.licenseNumber, experience: d.experience, consultationFee: d.consultationFee, department: d.department, bio: d.bio });
          this.loading = false;
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const req = this.isEdit
      ? this.http.put(`${environment.apiUrl}/doctors/${this.doctorId}`, this.form.value)
      : this.http.post(`${environment.apiUrl}/doctors`, this.form.value);
    req.subscribe({
      next: () => { this.snack.open(this.isEdit ? 'Doctor updated!' : 'Doctor added!', 'Close', { duration: 3000 }); this.router.navigate(['/doctors']); },
      error: (err) => { this.saving = false; this.snack.open(err.error?.message || 'Save failed', 'Close', { duration: 4000 }); }
    });
  }
}
