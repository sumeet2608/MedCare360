import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface MedItem {
  medicineName: string; genericName: string; strength: string;
  dosageForm: string; dose: string; frequency: string; route: string;
  duration: string; quantity: number; refills: number; instructions: string;
}

@Component({
  selector: 'app-prescription-generator',
  templateUrl: './prescription-generator.component.html',
  styleUrls: ['./prescription-generator.component.scss']
})
export class PrescriptionGeneratorComponent implements OnInit {
  rxId = '';
  patients: any[] = [];
  doctors: any[] = [];
  loading = false;
  saving = false;
  rx: any = {
    patient: '', doctor: '', diagnosis: '', icd10Code: '', clinicalNotes: '',
    medications: [], validUntil: this.defaultExpiry(), status: 'active'
  };

  icd10Query = ''; icd10Results: any[] = []; icd10Loading = false;

  newMed: MedItem = this.emptyMed();

  readonly dosageForms = ['tablet','capsule','syrup','injection','drops','cream','inhaler','patch','suppository','other'];
  readonly routes = ['oral','iv','im','sc','topical','inhalation','sublingual','rectal','other'];
  readonly frequencies = ['Once daily (OD)','Twice daily (BD)','Three times daily (TID)','Four times daily (QID)','Every 8 hours','Every 6 hours','At bedtime (HS)','As needed (PRN)','Stat'];

  constructor(
    private http: HttpClient, private route: ActivatedRoute,
    private router: Router, private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.rxId = this.route.snapshot.paramMap.get('id') || '';
    const patientParam = this.route.snapshot.queryParamMap.get('patient');
    if (patientParam) this.rx.patient = patientParam;
    this.loadMeta();
    if (this.rxId && this.rxId !== 'new') this.loadRx();
  }

  defaultExpiry(): string {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }

  emptyMed(): MedItem {
    return { medicineName: '', genericName: '', strength: '', dosageForm: 'tablet', dose: '', frequency: '', route: 'oral', duration: '', quantity: 0, refills: 0, instructions: '' };
  }

  loadMeta(): void {
    this.http.get<any>(`${environment.apiUrl}/patients?limit=100`).subscribe({
      next: r => { this.patients = (r.data||[]).map((p: any) => ({ ...p, fullName: `${p.user?.firstName||''} ${p.user?.lastName||''}`.trim() })); }
    });
    this.http.get<any>(`${environment.apiUrl}/doctors?limit=100`).subscribe({
      next: r => { this.doctors = (r.data||[]).map((d: any) => ({ ...d, fullName: `Dr. ${d.user?.firstName||''} ${d.user?.lastName||''}`.trim() })); }
    });
  }

  loadRx(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/emr/prescriptions/${this.rxId}`).subscribe({
      next: r => { this.rx = { ...this.rx, ...r.data, patient: r.data.patient?._id || r.data.patient, doctor: r.data.doctor?._id || r.data.doctor }; this.loading = false; },
      error: () => { this.loading = false; this.snack.open('Failed to load prescription','Close',{duration:3000}); }
    });
  }

  searchICD10(): void {
    if (!this.icd10Query.trim()) return;
    this.icd10Loading = true;
    this.http.get<any>(`${environment.apiUrl}/emr/icd10/search?q=${this.icd10Query}`).subscribe({
      next: r => { this.icd10Results = r.data||[]; this.icd10Loading = false; },
      error: () => { this.icd10Loading = false; }
    });
  }

  selectICD10(code: any): void {
    this.rx.icd10Code = code.code;
    if (!this.rx.diagnosis) this.rx.diagnosis = code.description;
    this.icd10Results = []; this.icd10Query = '';
  }

  addMedication(): void {
    if (!this.newMed.medicineName.trim()) { this.snack.open('Enter medicine name','Close',{duration:2000}); return; }
    if (!this.newMed.frequency.trim())    { this.snack.open('Enter frequency','Close',{duration:2000}); return; }
    this.rx.medications.push({ ...this.newMed });
    this.newMed = this.emptyMed();
  }

  removeMed(i: number): void { this.rx.medications.splice(i, 1); }

  save(): void {
    if (!this.rx.patient)                         { this.snack.open('Select a patient','Close',{duration:3000}); return; }
    if (!this.rx.medications.length)              { this.snack.open('Add at least one medication','Close',{duration:3000}); return; }
    this.saving = true;
    const req = this.rxId && this.rxId !== 'new'
      ? this.http.put<any>(`${environment.apiUrl}/emr/prescriptions/${this.rxId}`, this.rx)
      : this.http.post<any>(`${environment.apiUrl}/emr/prescriptions`, this.rx);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Prescription saved ✓','Close',{duration:2500, panelClass:'success-snack'});
        this.router.navigate(['/emr']);
      },
      error: err => { this.saving = false; this.snack.open(err.error?.message||'Save failed','Close',{duration:3000}); }
    });
  }

  printRx(): void { window.print(); }
  cancel(): void { this.router.navigate(['/emr']); }

  get selectedPatient(): any { return this.patients.find(p => p._id === this.rx.patient); }
  get selectedDoctor(): any  { return this.doctors.find(d => d._id === this.rx.doctor); }
}
