import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-invoice', templateUrl: './invoice.component.html' })
export class InvoiceComponent implements OnInit {
  form!: FormGroup;
  patients: any[] = [];
  invoiceData: any = null;
  saving = false; loading = false; isView = false;
  invoiceId: string | null = null;
  categories = ['consultation','procedure','medicine','lab_test','room','nursing','ambulance','equipment','other'];

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router, private route: ActivatedRoute, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      patient: ['', Validators.required],
      items: this.fb.array([]),
      notes: [''],
      dueDate: ['']
    });
    this.http.get<any>(`${environment.apiUrl}/patients?limit=200`).subscribe({ next: r => this.patients = r.data });

    this.invoiceId = this.route.snapshot.paramMap.get('id');
    if (this.invoiceId) {
      this.isView = true; this.loading = true;
      this.http.get<any>(`${environment.apiUrl}/billing/${this.invoiceId}`).subscribe({
        next: res => { this.invoiceData = res.data; this.loading = false; },
        error: () => { this.loading = false; this.router.navigate(['/billing']); }
      });
    } else {
      this.addItem();
    }
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  addItem(): void {
    this.items.push(this.fb.group({
      description: ['', Validators.required],
      category: ['consultation'],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0], tax: [0],
      total: [{ value: 0, disabled: true }]
    }));
  }

  removeItem(i: number): void { if (this.items.length > 1) this.items.removeAt(i); }

  calcTotal(i: number): void {
    const item = this.items.at(i);
    const qty = item.get('quantity')?.value || 0;
    const price = item.get('unitPrice')?.value || 0;
    const disc = item.get('discount')?.value || 0;
    const tax = item.get('tax')?.value || 0;
    const total = (qty * price) - disc + tax;
    item.get('total')?.setValue(total);
  }

  get grandTotal(): number {
    return this.items.controls.reduce((sum, item) => {
      const qty = item.get('quantity')?.value || 0;
      const price = item.get('unitPrice')?.value || 0;
      const disc = item.get('discount')?.value || 0;
      const tax = item.get('tax')?.value || 0;
      return sum + (qty * price) - disc + tax;
    }, 0);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.getRawValue();
    const items = v.items.map((item: any) => ({ ...item, total: (item.quantity * item.unitPrice) - item.discount + item.tax }));
    const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unitPrice), 0);
    const totalDiscount = items.reduce((s: number, i: any) => s + i.discount, 0);
    const totalTax = items.reduce((s: number, i: any) => s + i.tax, 0);
    const payload = { patient: v.patient, items, subtotal, totalDiscount, totalTax, totalAmount: this.grandTotal, notes: v.notes, dueDate: v.dueDate };

    this.http.post(`${environment.apiUrl}/billing`, payload).subscribe({
      next: () => { this.snack.open('Invoice created!', 'Close', { duration: 3000 }); this.router.navigate(['/billing']); },
      error: (err) => { this.saving = false; this.snack.open(err.error?.message || 'Failed', 'Close', { duration: 4000 }); }
    });
  }
}
