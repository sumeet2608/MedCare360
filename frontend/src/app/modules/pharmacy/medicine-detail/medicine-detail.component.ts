import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-medicine-detail', templateUrl: './medicine-detail.component.html', styleUrls: ['./medicine-detail.component.scss'] })
export class MedicineDetailComponent implements OnInit {
  medicine: any = null;
  loading = true;
  notFound = false;

  enrichment: any = null;
  enrichLoading = false;
  enrichSource: string | null = null;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound = true; this.loading = false; return; }
    this.http.get<any>(`${environment.apiUrl}/pharmacy/${id}`).subscribe({
      next: res => {
        this.medicine = res.data;
        this.loading = false;
        this.loadEnrichment(id);
      },
      error: () => { this.loading = false; this.notFound = true; }
    });
  }

  loadEnrichment(id: string): void {
    this.enrichLoading = true;
    this.http.get<any>(`${environment.apiUrl}/pharmacy/${id}/enrich`).subscribe({
      next: res => {
        this.enrichment = res.data?.openFda || null;
        this.enrichSource = res.source;
        this.enrichLoading = false;
      },
      error: () => { this.enrichLoading = false; this.enrichSource = 'unavailable'; }
    });
  }

  stockStatus(): { label: string; cls: string } {
    if (!this.medicine) return { label: '', cls: '' };
    if (this.medicine.isExpired) return { label: 'Expired', cls: 'danger' };
    if (this.medicine.isExpiringSoon) return { label: 'Expiring Soon', cls: 'warn' };
    if (this.medicine.isLowStock) return { label: 'Low Stock', cls: 'warn' };
    return { label: 'In Stock', cls: 'ok' };
  }

  editMedicine(): void { this.router.navigate(['/pharmacy', this.medicine._id, 'edit']); }
  goBack(): void { this.router.navigate(['/pharmacy']); }
  compareWith(): void { this.router.navigate(['/pharmacy/compare'], { queryParams: { ids: this.medicine._id } }); }
}
