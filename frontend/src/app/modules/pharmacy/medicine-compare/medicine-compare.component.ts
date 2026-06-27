import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-medicine-compare', templateUrl: './medicine-compare.component.html', styleUrls: ['./medicine-compare.component.scss'] })
export class MedicineCompareComponent implements OnInit {
  medicines: any[] = [];
  loading = true;
  searchTerm = '';
  searchResults: any[] = [];
  searching = false;

  rows = [
    { key: 'category', label: 'Category', fmt: 'titlecase' },
    { key: 'type', label: 'Form', fmt: 'titlecase' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'sellingPrice', label: 'Price', fmt: 'currency' },
    { key: 'requiresPrescription', label: 'Prescription Required', fmt: 'bool' },
    { key: 'activeIngredients', label: 'Active Ingredients', fmt: 'list' },
    { key: 'sideEffects', label: 'Side Effects', fmt: 'list' },
    { key: 'contraindications', label: 'Contraindications', fmt: 'list' },
    { key: 'dosageInstructions', label: 'Dosage Instructions' },
    { key: 'storageInstructions', label: 'Storage' },
  ];

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const idsParam = this.route.snapshot.queryParamMap.get('ids');
    const ids = idsParam ? idsParam.split(',').filter(Boolean) : [];
    if (!ids.length) { this.loading = false; return; }
    this.http.get<any>(`${environment.apiUrl}/pharmacy/compare`, { params: { ids: ids.join(',') } }).subscribe({
      next: res => { this.medicines = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  cellValue(med: any, row: any): string {
    const v = med[row.key];
    if (row.fmt === 'bool') return v ? 'Yes' : 'No';
    if (row.fmt === 'list') return (v || []).join(', ') || '—';
    if (row.fmt === 'currency') return v != null ? `₹${v}` : '—';
    if (row.fmt === 'titlecase') return v ? (v.charAt(0).toUpperCase() + v.slice(1)) : '—';
    return v ?? '—';
  }

  searchToAdd(value: string): void {
    this.searchTerm = value.trim();
    if (this.searchTerm.length < 2) { this.searchResults = []; return; }
    this.searching = true;
    this.http.get<any>(`${environment.apiUrl}/pharmacy`, { params: { search: this.searchTerm, limit: '10' } }).subscribe({
      next: res => {
        const existingIds = new Set(this.medicines.map(m => m._id));
        this.searchResults = (res.data || []).filter((m: any) => !existingIds.has(m._id));
        this.searching = false;
      },
      error: () => { this.searching = false; }
    });
  }

  addMedicine(med: any): void {
    if (this.medicines.length >= 4) return;
    this.medicines.push(med);
    this.searchResults = [];
    this.searchTerm = '';
    this.updateUrl();
  }

  removeMedicine(id: string): void {
    this.medicines = this.medicines.filter(m => m._id !== id);
    this.updateUrl();
  }

  updateUrl(): void {
    this.router.navigate([], { queryParams: { ids: this.medicines.map(m => m._id).join(',') }, replaceUrl: true });
  }

  goBack(): void { this.router.navigate(['/pharmacy']); }
}
