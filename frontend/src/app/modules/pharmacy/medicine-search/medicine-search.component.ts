import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-medicine-search', templateUrl: './medicine-search.component.html', styleUrls: ['./medicine-search.component.scss'] })
export class MedicineSearchComponent {
  query = '';
  localResults: any[] = [];
  externalResults: any[] = [];
  loading = false;
  searched = false;
  totalMedicines = 0;

  readonly rxNormExamples = ['Amoxicillin','Ibuprofen','Metformin','Paracetamol','Ondansetron',
    'Atorvastatin','Omeprazole','Amlodipine','Ciprofloxacin','Azithromycin',
    'Pantoprazole','Cetirizine','Doxycycline','Metronidazole','Cefixime'];

  constructor(private http: HttpClient, public router: Router) {
    this.loadTotal();
  }

  loadTotal(): void {
    this.http.get<any>(`${environment.apiUrl}/pharmacy?limit=1`).subscribe({
      next: res => this.totalMedicines = res.total || 0,
      error: () => {}
    });
  }

  onSearch(value: string): void {
    this.query = value.trim();
    if (this.query.length < 2) { this.localResults = []; this.externalResults = []; this.searched = false; return; }
    this.loading = true;
    this.searched = true;

    this.http.get<any>(`${environment.apiUrl}/pharmacy`, { params: { search: this.query, limit: '20' } }).subscribe({
      next: res => { this.localResults = res.data || []; },
      error: () => { this.localResults = []; }
    });

    this.http.get<any>(`${environment.apiUrl}/pharmacy/search-external`, { params: { q: this.query } }).subscribe({
      next: res => { this.externalResults = (res.data || []).slice(0, 12); this.loading = false; },
      error: () => { this.externalResults = []; this.loading = false; }
    });
  }

  viewMedicine(id: string): void { this.router.navigate(['/pharmacy', id]); }
}
