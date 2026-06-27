import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { GridColumn } from '../../shared/components/data-grid/data-grid.component';

@Component({ selector: 'app-lab', templateUrl: './lab.component.html', styleUrls: ['./lab.component.scss'] })
export class LabComponent implements OnInit {
  tests: any[] = [];
  loading = true; total = 0;

  columns: GridColumn[] = [
    { key: 'testId', label: 'Test ID' },
    { key: 'patientName', label: 'Patient', sortable: true },
    { key: 'testName', label: 'Test Name', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Date', type: 'date', sortable: true },
    { key: 'actions', label: 'Actions' },
  ];

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/lab`).subscribe({
      next: res => {
        this.tests = (res.data || []).map((t: any) => ({
          ...t,
          patientName: `${t.patient?.user?.firstName || ''} ${t.patient?.user?.lastName || ''}`.trim()
        }));
        this.total = res.total;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  updateStatus(id: string, status: string): void {
    this.http.put(`${environment.apiUrl}/lab/${id}`, { status }).subscribe({
      next: () => { this.snack.open('Status updated', 'Close', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Update failed', 'Close', { duration: 3000 })
    });
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = { ordered: 'pending', sample_collected: 'pending', processing: 'pending', completed: 'active', cancelled: 'cancelled' };
    return m[s] || 'pending';
  }

  getPriorityColor(p: string): string {
    return { routine: '#4caf50', urgent: '#ff9800', stat: '#f44336' }[p] || '#666';
  }
}
