import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-forgot-password', templateUrl: './forgot-password.component.html' })
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  submitted = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private snack: MatSnackBar) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.forgotPassword(this.form.value.email).subscribe({
      next: () => { this.loading = false; this.submitted = true; },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Failed to send reset email.', 'Close', { duration: 4000 });
      }
    });
  }
}
