import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-clinical-timeline',
  templateUrl: './clinical-timeline.component.html',
  styleUrls: ['./clinical-timeline.component.scss']
})
export class ClinicalTimelineComponent implements OnInit {
  patientId = '';
  patient: any = null;
  timeline: any[] = [];
  filteredTimeline: any[] = [];
  loading = true;
  filterType = 'all';
  searchTerm = '';

  readonly filterOptions = [
    { value: 'all',           label: 'All Events',      icon: 'timeline' },
    { value: 'medical_record',label: 'Medical Records', icon: 'folder_open' },
    { value: 'soap_note',     label: 'SOAP Notes',      icon: 'assignment' },
    { value: 'prescription',  label: 'Prescriptions',   icon: 'medication' }
  ];

  readonly typeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    medical_record: { label: 'Medical Record', icon: 'folder_open',   color: '#0891b2', bg: '#e0f2fe' },
    soap_note:      { label: 'SOAP Note',      icon: 'assignment',    color: '#059669', bg: '#d1fae5' },
    prescription:   { label: 'Prescription',   icon: 'local_pharmacy',color: '#7c3aed', bg: '#ede9fe' }
  };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') || '';
    this.loadTimeline();
  }

  loadTimeline(): void {
    this.loading = true;
    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/emr/timeline/${this.patientId}`).toPromise().catch(() => ({ data: [] })),
      this.http.get<any>(`${environment.apiUrl}/patients/${this.patientId}`).toPromise().catch(() => ({ data: null }))
    ]).then(([tl, pt]) => {
      this.timeline = tl?.data || [];
      this.patient = pt?.data;
      this.applyFilter();
      this.loading = false;
    });
  }

  applyFilter(): void {
    let result = this.filterType === 'all' ? this.timeline : this.timeline.filter(e => e.type === this.filterType);
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(e => JSON.stringify(e.data).toLowerCase().includes(q));
    }
    this.filteredTimeline = result;
  }

  setFilter(type: string): void { this.filterType = type; this.applyFilter(); }

  getTypeConf(type: string) { return this.typeConfig[type] || { label: type, icon: 'event', color: '#6b7280', bg: '#f3f4f6' }; }

  getTitle(event: any): string {
    const { type, data } = event;
    if (type === 'medical_record') return data.diagnoses?.[0]?.icd10Description || data.chiefComplaint || 'Medical Encounter';
    if (type === 'soap_note')    return data.subjective?.chiefComplaint || 'SOAP Note';
    if (type === 'prescription') return `${data.medications?.length || 0} Medication(s) — ${data.diagnosis || 'Prescription'}`;
    return 'Clinical Event';
  }

  getSubtitle(event: any): string {
    const { type, data } = event;
    if (type === 'medical_record') return `${data.encounter?.type || 'Encounter'} · ${this.docName(data)}`;
    if (type === 'soap_note')    return `${data.assessment?.primaryDiagnosis || 'Assessment pending'} · ${this.docName(data)}`;
    if (type === 'prescription') return `${data.medications?.map((m: any) => m.medicineName).slice(0,2).join(', ')} · ${this.docName(data)}`;
    return '';
  }

  docName(data: any): string {
    const d = data.doctor || data.attendingDoctor;
    if (!d) return '';
    return `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim();
  }

  get patientName(): string {
    if (!this.patient) return 'Patient';
    return `${this.patient.user?.firstName || ''} ${this.patient.user?.lastName || ''}`.trim();
  }

  openEvent(event: any): void {
    if (event.type === 'soap_note')    this.router.navigate(['/emr/soap', event.id]);
    if (event.type === 'prescription') this.router.navigate(['/emr/prescription', event.id]);
  }

  newSOAP(): void { this.router.navigate(['/emr/soap/new'], { queryParams: { patient: this.patientId } }); }
  newRx():   void { this.router.navigate(['/emr/prescription/new'], { queryParams: { patient: this.patientId } }); }
  back():    void { this.router.navigate(['/emr']); }

  countByType(type: string): number { return this.timeline.filter(e => e.type === type).length; }
}
