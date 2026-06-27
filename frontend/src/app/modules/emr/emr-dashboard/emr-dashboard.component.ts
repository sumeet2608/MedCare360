import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-emr-dashboard',
  templateUrl: './emr-dashboard.component.html',
  styleUrls: ['./emr-dashboard.component.scss']
})
export class EmrDashboardComponent implements OnInit {
  recentRecords: any[] = [];
  recentPrescriptions: any[] = [];
  recentNotes: any[] = [];
  loading = true;
  searchQuery = '';
  patients: any[] = [];
  filteredPatients: any[] = [];

  stats = { records: 0, prescriptions: 0, notes: 0, today: 0 };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/emr/records?limit=5`).toPromise().catch(() => ({ data: [] })),
      this.http.get<any>(`${environment.apiUrl}/emr/prescriptions?limit=5`).toPromise().catch(() => ({ data: [] })),
      this.http.get<any>(`${environment.apiUrl}/emr/soap?limit=5`).toPromise().catch(() => ({ data: [] })),
      this.http.get<any>(`${environment.apiUrl}/patients?limit=100`).toPromise().catch(() => ({ data: [] }))
    ]).then(([records, rx, notes, pts]) => {
      this.recentRecords = records?.data || [];
      this.recentPrescriptions = rx?.data || [];
      this.recentNotes = notes?.data || [];
      this.patients = (pts?.data || []).map((p: any) => ({
        ...p, fullName: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim()
      }));
      this.filteredPatients = this.patients;
      this.stats.records = records?.total || this.recentRecords.length;
      this.stats.prescriptions = rx?.total || this.recentPrescriptions.length;
      this.stats.notes = notes?.total || this.recentNotes.length;
      this.loading = false;
    });
  }

  filterPatients(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredPatients = q
      ? this.patients.filter(p => p.fullName.toLowerCase().includes(q) || p.patientId?.toLowerCase().includes(q))
      : this.patients;
  }

  viewTimeline(patientId: string): void { this.router.navigate(['/emr/timeline', patientId]); }
  newSOAP(): void { this.router.navigate(['/emr/soap/new']); }
  newPrescription(): void { this.router.navigate(['/emr/prescription/new']); }
  viewPrescription(id: string): void { this.router.navigate(['/emr/prescription', id]); }
  viewNote(id: string): void { this.router.navigate(['/emr/soap', id]); }

  patientName(p: any): string {
    return `${p.patient?.user?.firstName || ''} ${p.patient?.user?.lastName || ''}`.trim() || 'Unknown Patient';
  }
  doctorName(item: any): string {
    const d = item.doctor || item.attendingDoctor;
    return d ? `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() : 'Unknown';
  }
}
