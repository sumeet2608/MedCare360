import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-pharmacy-list', templateUrl: './pharmacy-list.component.html' })
export class PharmacyListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns = ['medicineId','name','category','type','quantity','expiryDate','price','stockStatus','actions'];
  loading = true; total = 0;
  showLowStock = false; showExpiring = false;

  constructor(private http: HttpClient, private router: Router, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    let url = `${environment.apiUrl}/pharmacy?limit=100`;
    if (this.showLowStock) url = `${environment.apiUrl}/pharmacy/low-stock`;
    if (this.showExpiring) url = `${environment.apiUrl}/pharmacy/expiring`;

    this.http.get<any>(url).subscribe({
      next: res => {
        this.dataSource.data = res.data; this.total = res.total || res.count;
        setTimeout(() => { this.dataSource.sort = this.sort; this.dataSource.paginator = this.paginator; });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(e: Event): void { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  updateStock(id: string, operation: string): void {
    const qty = prompt(`Enter quantity to ${operation}:`);
    if (!qty || isNaN(+qty)) return;
    this.http.patch(`${environment.apiUrl}/pharmacy/${id}/stock`, { quantity: +qty, operation }).subscribe({
      next: () => { this.snack.open('Stock updated', 'Close', { duration: 2000 }); this.load(); },
      error: (err) => this.snack.open(err.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  getStockClass(m: any): string {
    if (m.isExpired) return 'cancelled';
    if (m.isLowStock) return 'pending';
    return 'active';
  }

  getStockLabel(m: any): string {
    if (m.isExpired) return 'Expired';
    if (m.isExpiringSoon) return 'Expiring Soon';
    if (m.isLowStock) return 'Low Stock';
    return 'In Stock';
  }
}
