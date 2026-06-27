import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-soap-note-editor',
  templateUrl: './soap-note-editor.component.html',
  styleUrls: ['./soap-note-editor.component.scss']
})
export class SoapNoteEditorComponent implements OnInit {
  noteId = '';
  patientId = '';
  patients: any[] = [];
  doctors: any[] = [];
  loading = false;
  saving = false;
  isSigned = false;

  note: any = {
    patient: '', doctor: '', encounterDate: new Date().toISOString().split('T')[0],
    subjective: { chiefComplaint: '', hpi: '', symptoms: [], duration: '', severity: 'moderate', associatedSymptoms: [], pertinentHistory: '', medicationHistory: '', allergies: [] },
    objective: { vitals: { bp: '', hr: null, temp: null, rr: null, spo2: null, weight: null, height: null }, physicalExam: '', generalAppearance: '', labResults: '', imagingFindings: '' },
    assessment: { primaryDiagnosis: '', icd10Code: '', icd10Description: '', secondaryDiagnoses: [], differentials: [], clinicalReasoning: '', prognosis: '' },
    plan: { medications: [], investigations: [], procedures: [], referrals: [], patientEducation: '', followUp: '', restrictions: '', goals: [] },
    status: 'draft', tags: []
  };

  // ICD-10 search
  icd10Query = ''; icd10Results: any[] = []; icd10Loading = false;
  // Temp inputs for array fields
  symptomInput = ''; differentialInput = ''; medInput = ''; investInput = '';

  constructor(
    private http: HttpClient, private route: ActivatedRoute,
    private router: Router, private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.noteId = this.route.snapshot.paramMap.get('id') || '';
    this.patientId = this.route.snapshot.queryParamMap.get('patient') || '';
    if (this.patientId) this.note.patient = this.patientId;
    this.loadMeta();
    if (this.noteId && this.noteId !== 'new') this.loadNote();
  }

  loadMeta(): void {
    this.http.get<any>(`${environment.apiUrl}/patients?limit=100`).subscribe({
      next: r => { this.patients = (r.data || []).map((p: any) => ({ ...p, fullName: `${p.user?.firstName||''} ${p.user?.lastName||''}`.trim() })); }
    });
    this.http.get<any>(`${environment.apiUrl}/doctors?limit=100`).subscribe({
      next: r => { this.doctors = (r.data || []).map((d: any) => ({ ...d, fullName: `Dr. ${d.user?.firstName||''} ${d.user?.lastName||''}`.trim() })); }
    });
  }

  loadNote(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/emr/soap/${this.noteId}`).subscribe({
      next: r => { this.note = { ...this.note, ...r.data }; this.isSigned = r.data.status === 'signed'; this.loading = false; },
      error: () => { this.loading = false; this.snack.open('Failed to load note', 'Close', { duration: 3000 }); }
    });
  }

  searchICD10(): void {
    if (!this.icd10Query.trim()) return;
    this.icd10Loading = true;
    this.http.get<any>(`${environment.apiUrl}/emr/icd10/search?q=${this.icd10Query}`).subscribe({
      next: r => { this.icd10Results = r.data || []; this.icd10Loading = false; },
      error: () => { this.icd10Loading = false; }
    });
  }

  selectICD10(code: any): void {
    this.note.assessment.icd10Code = code.code;
    this.note.assessment.icd10Description = code.description;
    if (!this.note.assessment.primaryDiagnosis) this.note.assessment.primaryDiagnosis = code.description;
    this.icd10Results = []; this.icd10Query = '';
  }

  addToArray(field: string, inputField: string): void {
    const val = (this as any)[inputField]?.trim();
    if (!val) return;
    const parts = field.split('.');
    let obj = this.note;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    if (!obj[parts[parts.length - 1]]) obj[parts[parts.length - 1]] = [];
    obj[parts[parts.length - 1]].push(val);
    (this as any)[inputField] = '';
  }

  removeFromArray(field: string, idx: number): void {
    const parts = field.split('.');
    let obj = this.note;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]].splice(idx, 1);
  }

  save(sign = false): void {
    if (!this.note.patient) { this.snack.open('Select a patient', 'Close', { duration: 3000 }); return; }
    if (!this.note.subjective.chiefComplaint) { this.snack.open('Chief complaint is required', 'Close', { duration: 3000 }); return; }
    this.saving = true;
    const payload = { ...this.note, status: sign ? 'signed' : 'draft' };
    const req = this.noteId && this.noteId !== 'new'
      ? this.http.put<any>(`${environment.apiUrl}/emr/soap/${this.noteId}`, payload)
      : this.http.post<any>(`${environment.apiUrl}/emr/soap`, payload);
    req.subscribe({
      next: r => {
        this.saving = false;
        this.snack.open(sign ? 'SOAP note signed ✓' : 'Saved as draft ✓', 'Close', { duration: 2000, panelClass: 'success-snack' });
        if (sign && this.noteId) {
          this.http.patch(`${environment.apiUrl}/emr/soap/${r.data._id}/sign`, {}).subscribe();
        }
        this.router.navigate(['/emr']);
      },
      error: err => { this.saving = false; this.snack.open(err.error?.message || 'Save failed', 'Close', { duration: 3000 }); }
    });
  }

  cancel(): void { this.router.navigate(['/emr']); }
  patientName(id: string): string { return this.patients.find(p => p._id === id)?.fullName || id; }
}
