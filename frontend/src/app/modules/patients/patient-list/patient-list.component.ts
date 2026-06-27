import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { GridColumn } from '../../../shared/components/data-grid/data-grid.component';

@Component({ selector: 'app-patient-list', templateUrl: './patient-list.component.html', styleUrls: ['./patient-list.component.scss'] })
export class PatientListComponent implements OnInit {
  patients: any[] = [];
  loading = true;
  totalPatients = 0;

  columns: GridColumn[] = [
    { key: 'patientId',  label: 'Patient ID' },
    { key: 'fullName',   label: 'Patient Name', sortable: true },
    { key: 'gender',     label: 'Gender' },
    { key: 'bloodGroup', label: 'Blood Group' },
    { key: 'phone',      label: 'Phone' },
    { key: 'status',     label: 'Status' },
    { key: 'actions',    label: 'Actions' },
  ];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void { this.loadPatients(); }

  loadPatients(): void {
    this.loading = true;
    this.api.getPatients({ limit: 1000 }).subscribe({
      next: res => {
        this.patients = (res.data || []).map((p: any) => ({
          ...p,
          fullName: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
          phone: p.user?.phone
        }));
        this.totalPatients = res.total || 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get admittedCount(): number  { return this.patients.filter(p => p.isAdmitted).length; }
  get outpatientCount(): number { return this.patients.filter(p => !p.isAdmitted).length; }

  viewPatient(id: string): void { this.router.navigate(['/patients', id]); }
  editPatient(id: string): void { this.router.navigate(['/patients', id, 'edit']); }

  deletePatient(id: string): void {
    if (!confirm('Delete this patient record? This cannot be undone.')) return;
    this.api.delete(`/patients/${id}`, 'Patient deleted').subscribe({
      next: () => this.loadPatients(),
      error: () => {}
    });
  }
}
