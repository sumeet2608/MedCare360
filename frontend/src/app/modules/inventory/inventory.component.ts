import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { GridColumn } from '../../shared/components/data-grid/data-grid.component';

@Component({ selector: 'app-inventory', templateUrl: './inventory.component.html' })
export class InventoryComponent implements OnInit {
  items: any[] = [];
  loading = true; total = 0;
  showAddForm = false;
  newItem = { name: '', category: 'medical_equipment', quantity: 1, location: '', description: '' };
  categories = ['medical_equipment', 'surgical_instruments', 'consumables', 'ppe', 'diagnostic', 'furniture', 'it_equipment', 'other'];

  columns: GridColumn[] = [
    { key: 'itemId', label: 'ID' },
    { key: 'name', label: 'Item Name', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Qty', type: 'number', sortable: true },
    { key: 'condition', label: 'Condition' },
    { key: 'location', label: 'Location' },
    { key: 'actions', label: 'Actions' },
  ];

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/inventory`).subscribe({
      next: res => { this.items = res.data || []; this.total = res.count; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  addItem(): void {
    this.http.post(`${environment.apiUrl}/inventory`, this.newItem).subscribe({
      next: () => { this.snack.open('Item added!', 'Close', { duration: 2000 }); this.showAddForm = false; this.newItem = { name: '', category: 'medical_equipment', quantity: 1, location: '', description: '' }; this.load(); },
      error: (err) => this.snack.open(err.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  delete(id: string): void {
    if (!confirm('Delete this item?')) return;
    this.http.delete(`${environment.apiUrl}/inventory/${id}`).subscribe({
      next: () => { this.snack.open('Deleted', 'Close', { duration: 2000 }); this.load(); }
    });
  }

  getConditionClass(c: string): string {
    return ({ new: 'active', good: 'active', fair: 'pending', poor: 'cancelled', out_of_service: 'cancelled' } as Record<string, string>)[c] || 'pending';
  }
}
