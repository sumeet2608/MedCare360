import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  hidePassword = true;

  features = [
    { icon: 'people',          label: 'Patient Management',  color: 'linear-gradient(135deg,#0891b2,#0e7490)' },
    { icon: 'smart_toy',       label: 'AI Medical Assistant', color: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { icon: 'analytics',       label: 'Real-time Analytics',  color: 'linear-gradient(135deg,#059669,#047857)' },
    { icon: 'emergency',       label: 'Emergency Response',   color: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
    { icon: 'document_scanner',label: 'Medicine Scanner',     color: 'linear-gradient(135deg,#d97706,#b45309)' },
    { icon: 'biotech',         label: 'PACS Medical Imaging', color: 'linear-gradient(135deg,#0891b2,#6d28d9)' },
  ];

  particles = Array.from({ length: 18 }, (_, i) => ({
    x:     Math.random() * 100,
    delay: Math.random() * 6,
    dur:   6 + Math.random() * 8,
    size:  2 + Math.random() * 4,
  }));

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    if (this.auth.isAuthenticated) {
      this.router.navigate([this.auth.getDashboardRoute()]);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;

    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.snack.open('Welcome back!', 'Close', { duration: 2000, panelClass: 'success-snack' });
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Login failed. Please try again.', 'Close', {
          duration: 4000, panelClass: 'error-snack'
        });
      }
    });
  }

  activeRole: string | null = null;
  showDoctorPicker = false;
  doctorsLoading = false;
  doctorList: { name: string; email: string; specialization: string; initials: string; gradient: string }[] = [];
  pickerSearch = '';

  private readonly GRADIENTS = [
    'linear-gradient(135deg,#0891b2,#0e7490)',
    'linear-gradient(135deg,#059669,#047857)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#d97706,#b45309)',
    'linear-gradient(135deg,#dc2626,#b91c1c)',
    'linear-gradient(135deg,#0284c7,#0369a1)',
    'linear-gradient(135deg,#c026d3,#a21caf)',
    'linear-gradient(135deg,#0891b2,#7c3aed)',
  ];

  fillDemo(role: string): void {
    this.activeRole = role;
    this.showDoctorPicker = false;

    if (role === 'admin') {
      this.form.patchValue({ email: 'admin@medcare360.com', password: 'Admin@1234' });
      return;
    }
    if (role === 'patient') {
      this.form.patchValue({ email: 'patient@medcare360.com', password: 'Patient@1234' });
      return;
    }
    if (role === 'doctor') {
      // Show the picker so the user can choose which doctor to log in as.
      this.showDoctorPicker = true;
      this.pickerSearch = '';
      this.loadDoctors();
    }
  }

  loadDoctors(): void {
    if (this.doctorList.length > 0) return;
    this.doctorsLoading = true;
    // /doctors/public-list is unauthenticated — safe to call before login.
    this.http.get<any>(`${environment.apiUrl}/doctors/public-list`).subscribe({
      next: res => {
        this.doctorList = (res.data || []).map((d: any) => {
          const nameParts = (d.name || '').replace(/^Dr\.\s*/i, '').split(' ');
          const first = nameParts[0] || '';
          const last  = nameParts[nameParts.length - 1] || '';
          const code  = ((first.charCodeAt(0) || 0) + (last.charCodeAt(0) || 0)) % this.GRADIENTS.length;
          return {
            name:           d.name || `Dr. ${first} ${last}`.trim(),
            email:          d.email || '',
            specialization: d.specialization || '',
            initials:       `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}`,
            gradient:       this.GRADIENTS[code],
          };
        });
        if (this.doctorList.length === 0) this.setFallbackDoctors();
        this.doctorsLoading = false;
      },
      error: () => { this.setFallbackDoctors(); this.doctorsLoading = false; }
    });
  }

  private setFallbackDoctors(): void {
    this.doctorList = [
      { name: 'Dr. Rajesh Kumar',  email: 'doctor@medcare360.com',  specialization: 'Cardiology',  initials: 'RK', gradient: this.GRADIENTS[0] },
      { name: 'Dr. Priya Sharma',  email: 'doctor2@medcare360.com', specialization: 'Pediatrics',  initials: 'PS', gradient: this.GRADIENTS[1] },
      { name: 'Dr. Arun Mehta',    email: 'doctor3@medcare360.com', specialization: 'Orthopedics', initials: 'AM', gradient: this.GRADIENTS[2] },
    ];
  }

  get filteredDoctors() {
    const q = this.pickerSearch.trim().toLowerCase();
    if (!q) return this.doctorList;
    return this.doctorList.filter(d =>
      d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)
    );
  }

  selectDoctor(d: { email: string; [key: string]: any }): void {
    this.form.patchValue({ email: d.email, password: 'Doctor@1234' });
    this.showDoctorPicker = false;
    this.pickerSearch = '';
    setTimeout(() => this.onSubmit(), 80);
  }

  selectPatient(email: string): void {
    this.form.patchValue({ email, password: 'Patient@1234' });
    this.activeRole = null;
    setTimeout(() => this.onSubmit(), 80);
  }
}
