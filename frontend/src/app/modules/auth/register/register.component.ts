import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-register', templateUrl: './register.component.html', styleUrls: ['./register.component.scss'] })
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  hidePassword = true;

  benefits = [
    { icon: 'calendar_today',    title: 'Book Appointments',  desc: 'Schedule with top doctors instantly',   color: 'linear-gradient(135deg,#0891b2,#0e7490)' },
    { icon: 'smart_toy',         title: 'AI Health Assistant', desc: '24/7 symptom checker & health tips',   color: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
    { icon: 'receipt_long',      title: 'Digital Records',    desc: 'All prescriptions & reports in one place', color: 'linear-gradient(135deg,#059669,#047857)' },
    { icon: 'notifications',     title: 'Smart Reminders',    desc: 'Never miss a dose or appointment',      color: 'linear-gradient(135deg,#d97706,#b45309)' },
  ];

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private snack: MatSnackBar) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9+\-\s()]{10,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatch });
  }

  passwordMatch(g: AbstractControl) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  passwordStrength(): number {
    const pw = this.form.get('password')?.value || '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 12) score++;
    return score;
  }

  strengthLevel(): 'weak' | 'fair' | 'good' | 'strong' {
    return (['weak', 'weak', 'fair', 'good', 'strong'][this.passwordStrength()] as any) || 'weak';
  }

  strengthLabel(): string {
    return { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' }[this.strengthLevel()];
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { confirmPassword, ...data } = this.form.value;

    this.auth.register({ ...data, role: 'patient' }).subscribe({
      next: () => {
        this.snack.open('Registration successful! Welcome to MedCare 360.', 'Close', { duration: 3000 });
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Registration failed.', 'Close', { duration: 4000 });
      }
    });
  }
}
