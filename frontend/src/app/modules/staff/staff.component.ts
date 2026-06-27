import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { GridColumn } from '../../shared/components/data-grid/data-grid.component';

@Component({ selector: 'app-staff', templateUrl: './staff.component.html' })
export class StaffComponent implements OnInit {
  staffList: any[] = [];
  loading = true; total = 0;
  showAddForm = false;
  newStaff: any = { firstName: '', lastName: '', email: '', phone: '', role: 'nurse', department: '', designation: '', joinDate: '', shift: 'morning', employmentType: 'full_time' };
  roles = ['nurse', 'receptionist', 'pharmacist', 'lab_technician', 'ambulance_staff'];
  shifts = ['morning', 'afternoon', 'night', 'rotating'];

  columns: GridColumn[] = [
    { key: 'staffId', label: 'ID' },
    { key: 'fullName', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'designation', label: 'Designation' },
    { key: 'shift', label: 'Shift' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  constructor(private http: HttpClient, private snack: MatSnackBar) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/staff`).subscribe({
      next: res => {
        this.staffList = (res.data || []).map((s: any) => ({
          ...s,
          fullName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
          role: s.user?.role
        }));
        this.total = res.count;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  addStaff(): void {
    this.http.post(`${environment.apiUrl}/staff`, this.newStaff).subscribe({
      next: () => {
        this.snack.open('Staff member added!', 'Close', { duration: 3000 });
        this.showAddForm = false;
        this.newStaff = { firstName: '', lastName: '', email: '', phone: '', role: 'nurse', department: '', designation: '', joinDate: '', shift: 'morning', employmentType: 'full_time' };
        this.load();
      },
      error: (err) => this.snack.open(err.error?.message || 'Failed to add staff', 'Close', { duration: 4000 })
    });
  }

  delete(id: string): void {
    if (!confirm('Remove this staff member?')) return;
    this.http.delete(`${environment.apiUrl}/staff/${id}`).subscribe({
      next: () => { this.snack.open('Staff removed', 'Close', { duration: 2000 }); this.load(); }
    });
  }

  getStatusClass(s: string): string {
    return ({ active: 'active', on_leave: 'pending', resigned: 'cancelled', terminated: 'cancelled' } as Record<string, string>)[s] || 'pending';
  }
}
