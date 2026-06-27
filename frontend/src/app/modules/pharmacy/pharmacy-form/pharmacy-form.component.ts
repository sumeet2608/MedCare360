import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-pharmacy-form', templateUrl: './pharmacy-form.component.html' })
export class PharmacyFormComponent implements OnInit {
  form!: FormGroup;
  loading = false; saving = false; isEdit = false; medId: string | null = null;
  categories = ['antibiotic','analgesic','antiviral','antifungal','antihistamine','antihypertensive','antidiabetic','cardiac','respiratory','gastrointestinal','neurological','psychiatric','vitamin_supplement','other'];
  types = ['tablet','capsule','syrup','injection','cream','drops','inhaler','patch','suppository','powder'];

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router, private route: ActivatedRoute, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required], genericName: ['', Validators.required],
      brand: [''], category: ['', Validators.required], type: ['', Validators.required],
      manufacturer: [''], batchNumber: [''],
      expiryDate: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minStockLevel: [10, Validators.min(0)],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      sideEffects: [''], activeIngredients: [''],
      storageInstructions: [''], dosageInstructions: [''],
      requiresPrescription: [true]
    });

    this.medId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.medId;
    if (this.isEdit && this.medId) {
      this.loading = true;
      this.http.get<any>(`${environment.apiUrl}/pharmacy/${this.medId}`).subscribe({
        next: res => {
          const m = res.data;
          this.form.patchValue({ ...m, sideEffects: m.sideEffects?.join(', '), activeIngredients: m.activeIngredients?.join(', ') });
          this.loading = false;
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    const payload = { ...v, sideEffects: v.sideEffects?.split(',').map((s: string) => s.trim()).filter(Boolean), activeIngredients: v.activeIngredients?.split(',').map((s: string) => s.trim()).filter(Boolean) };
    const req = this.isEdit ? this.http.put(`${environment.apiUrl}/pharmacy/${this.medId}`, payload) : this.http.post(`${environment.apiUrl}/pharmacy`, payload);
    req.subscribe({
      next: () => { this.snack.open(this.isEdit ? 'Medicine updated!' : 'Medicine added!', 'Close', { duration: 3000 }); this.router.navigate(['/pharmacy']); },
      error: (err) => { this.saving = false; this.snack.open(err.error?.message || 'Save failed', 'Close', { duration: 4000 }); }
    });
  }
}
