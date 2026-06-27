import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-patient-form', templateUrl: './patient-form.component.html', styleUrls: ['./patient-form.component.scss'] })
export class PatientFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  saving = false;
  isEdit = false;
  patientId: string | null = null;

  bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  genders = ['male','female','other'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.patientId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.patientId && this.route.snapshot.url.some(s => s.path === 'edit');
    if (this.isEdit && this.patientId) { this.loadPatient(this.patientId); }
  }

  buildForm(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      bloodGroup: [''],
      street: [''], city: [''], state: [''], zipCode: [''],
      emergencyName: [''], emergencyRelationship: [''], emergencyPhone: [''],
      insuranceProvider: [''], insurancePolicyNumber: [''],
      chronicConditions: [''],
      notes: ['']
    });
  }

  loadPatient(id: string): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/patients/${id}`).subscribe({
      next: res => {
        const p = res.data;
        this.form.patchValue({
          firstName: p.user?.firstName, lastName: p.user?.lastName,
          email: p.user?.email, phone: p.user?.phone,
          dateOfBirth: p.dateOfBirth, gender: p.gender, bloodGroup: p.bloodGroup,
          street: p.address?.street, city: p.address?.city, state: p.address?.state, zipCode: p.address?.zipCode,
          emergencyName: p.emergencyContact?.name, emergencyRelationship: p.emergencyContact?.relationship, emergencyPhone: p.emergencyContact?.phone,
          insuranceProvider: p.insurance?.provider, insurancePolicyNumber: p.insurance?.policyNumber,
          chronicConditions: p.chronicConditions?.join(', ')
        });
        this.loading = false;
      },
      error: () => { this.loading = false; this.router.navigate(['/patients']); }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    const payload = {
      firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone,
      dateOfBirth: v.dateOfBirth, gender: v.gender, bloodGroup: v.bloodGroup,
      address: { street: v.street, city: v.city, state: v.state, zipCode: v.zipCode },
      emergencyContact: { name: v.emergencyName, relationship: v.emergencyRelationship, phone: v.emergencyPhone },
      insurance: { provider: v.insuranceProvider, policyNumber: v.insurancePolicyNumber },
      chronicConditions: v.chronicConditions ? v.chronicConditions.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    };

    const req = this.isEdit
      ? this.http.put(`${environment.apiUrl}/patients/${this.patientId}`, payload)
      : this.http.post(`${environment.apiUrl}/patients`, payload);

    req.subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Patient updated!' : 'Patient registered!', 'Close', { duration: 3000 });
        this.router.navigate(['/patients']);
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Save failed', 'Close', { duration: 4000 });
      }
    });
  }
}
