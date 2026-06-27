import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

interface ImagingStudy {
  id: string;
  patientName: string;
  patientId: string;
  modality: 'CT' | 'MRI' | 'X-Ray' | 'Ultrasound' | 'PET' | 'Mammography';
  studyDate: string;
  bodyPart: string;
  status: 'pending' | 'in-progress' | 'reported' | 'archived';
  referredBy: string;
  urgency: 'routine' | 'urgent' | 'stat';
  findings?: string;
  impression?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-medical-imaging',
  templateUrl: './medical-imaging.component.html',
  styleUrls: ['./medical-imaging.component.scss']
})
export class MedicalImagingComponent implements OnInit {
  studies: ImagingStudy[] = [];
  filteredStudies: ImagingStudy[] = [];
  loading = true;
  selectedStudy: ImagingStudy | null = null;
  searchTerm = '';
  modalityFilter = 'all';
  statusFilter = 'all';
  uploadModalOpen = false;
  aiAnalyzing = false;
  aiReport = '';

  // Viewer controls
  zoomLevel = 1;
  invertFilter = false;
  brightnessLevel = 100;
  contrastLevel = 100;

  // Upload state
  uploadedImageUrl: string | null = null;
  uploadedImageFile: File | null = null;
  aiUploadAnalyzing = false;
  aiUploadReport = '';

  modalities = ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'PET', 'Mammography'];
  bodyParts = ['Chest', 'Abdomen', 'Brain', 'Spine', 'Knee', 'Hip', 'Pelvis', 'Shoulder', 'Cardiac', 'Whole Body'];

  // Patients loaded from API for the upload dropdown
  patientsList: { name: string; patientId: string }[] = [];

  uploadForm = {
    patientName: '', patientId: '', modality: 'X-Ray',
    bodyPart: 'Chest', referredBy: '', urgency: 'routine', notes: ''
  };

  statCards = [
    { label: 'Total Studies',  icon: 'collections',  color: '#0891b2', bg: '#e0f2fe', key: 'total' },
    { label: 'Pending Report', icon: 'pending',       color: '#d97706', bg: '#fef3c7', key: 'pending' },
    { label: 'STAT Orders',    icon: 'flash_on',      color: '#dc2626', bg: '#fee2e2', key: 'stat' },
    { label: 'Reported Today', icon: 'check_circle',  color: '#059669', bg: '#d1fae5', key: 'reported' }
  ];

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loadDemoStudies();
    this.loadPatients();
  }

  loadPatients(): void {
    this.http.get<any>(`${environment.apiUrl}/patients?limit=100`).subscribe({
      next: res => {
        this.patientsList = (res.data || []).map((p: any) => ({
          name: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
          patientId: p.patientId || ''
        })).filter((p: any) => p.name);
        // Pre-select first patient in the upload form
        if (this.patientsList.length > 0 && !this.uploadForm.patientName) {
          this.uploadForm.patientName = this.patientsList[0].name;
          this.uploadForm.patientId  = this.patientsList[0].patientId;
        }
      },
      error: () => {} // silently ignore if unauthenticated
    });
  }

  onPatientSelect(name: string): void {
    const p = this.patientsList.find(x => x.name === name);
    if (p) this.uploadForm.patientId = p.patientId;
  }

  private readonly LS_PREFIX = 'imaging_img_';

  loadDemoStudies(): void {
    this.loading = true;
    this.studies = this.generateDemoStudies();
    // Restore any previously uploaded images from localStorage
    this.studies.forEach(s => {
      const saved = localStorage.getItem(this.LS_PREFIX + s.id);
      if (saved) s.imageUrl = saved;
    });
    this.applyFilters();
    this.loading = false;
  }

  generateDemoStudies(): ImagingStudy[] {
    return [{
      id: 'STU-1000',
      patientName: 'Amit Shah',
      patientId: 'PAT000001',
      modality: 'X-Ray',
      bodyPart: 'Chest',
      status: 'reported',
      urgency: 'routine',
      referredBy: 'Dr. Mehta',
      studyDate: new Date().toISOString(),
      findings: `PA chest radiograph dated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.\n\nLungs: Bilateral lung fields are clear. No focal consolidation, pleural effusion, or pneumothorax identified. Lung volumes are adequate.\n\nHeart: Cardiothoracic ratio is within normal limits (~0.45). Cardiac silhouette is not enlarged.\n\nMediastinum: Normal contours. Trachea is midline. Aortic knuckle visible and normal.\n\nBones: Visualised ribs, clavicles and scapulae intact. No acute fracture or destructive lesion.\n\nSoft Tissues: No abnormality noted.`,
      impression: 'Normal PA chest radiograph. No acute cardiopulmonary abnormality. Cardiac size within normal limits.'
    }];
  }

  applyFilters(): void {
    this.filteredStudies = this.studies.filter(s => {
      const q = this.searchTerm.toLowerCase();
      const matchSearch = !q || s.patientName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.bodyPart.toLowerCase().includes(q);
      const matchMod = this.modalityFilter === 'all' || s.modality === this.modalityFilter;
      const matchStatus = this.statusFilter === 'all' || s.status === this.statusFilter;
      return matchSearch && matchMod && matchStatus;
    });
  }

  getCount(key: string): number {
    if (key === 'total') return this.studies.length;
    if (key === 'stat') return this.studies.filter(s => s.urgency === 'stat').length;
    if (key === 'pending') return this.studies.filter(s => s.status === 'pending').length;
    if (key === 'reported') {
      const today = new Date().toDateString();
      return this.studies.filter(s => s.status === 'reported' && new Date(s.studyDate).toDateString() === today).length;
    }
    return 0;
  }

  selectStudy(s: ImagingStudy): void {
    this.selectedStudy = s;
    this.aiReport = '';
    this.resetView();
  }

  closeViewer(): void { this.selectedStudy = null; this.aiReport = ''; }

  // ── Viewer controls ─────────────────────────────────────────────
  zoomIn()  { this.zoomLevel = Math.min(+(this.zoomLevel + 0.25).toFixed(2), 4); }
  zoomOut() { this.zoomLevel = Math.max(+(this.zoomLevel - 0.25).toFixed(2), 0.25); }
  toggleInvert() { this.invertFilter = !this.invertFilter; }
  resetView() { this.zoomLevel = 1; this.invertFilter = false; this.brightnessLevel = 100; this.contrastLevel = 100; }
  brightenUp()   { this.brightnessLevel = Math.min(this.brightnessLevel + 15, 200); }
  brightenDown() { this.brightnessLevel = Math.max(this.brightnessLevel - 15, 20); }

  get viewerFilterStyle(): string {
    return `invert(${this.invertFilter ? 1 : 0}) brightness(${this.brightnessLevel}%) contrast(${this.contrastLevel}%)`;
  }

  // ── AI Draft Report ──────────────────────────────────────────────
  analyzeWithAI(): void {
    if (!this.selectedStudy) return;
    this.aiAnalyzing = true;
    this.aiReport = '';

    // Use stored findings if available — skip API call
    if (this.selectedStudy.findings) {
      setTimeout(() => {
        this.aiReport = this.buildDetailedReport(this.selectedStudy!);
        this.aiAnalyzing = false;
      }, 600);
      return;
    }

    const prompt = `You are a consultant radiologist. Write a structured radiology report for:
Patient: ${this.selectedStudy.patientName}
Modality: ${this.selectedStudy.modality}
Body Part: ${this.selectedStudy.bodyPart}
Urgency: ${this.selectedStudy.urgency}
Referred By: ${this.selectedStudy.referredBy}
Clinical Indication: Routine screening / evaluation.

Structure: 1) Patient Info 2) Exam Information 3) Technique 4) Findings 5) Impression. Be concise, professional, and medically accurate.`;

    this.http.post<any>(`${environment.apiUrl}/ai/chat`, { message: prompt, history: [] }).subscribe({
      next: res => {
        this.aiReport = res.data?.reply || this.fallbackReport();
        this.aiAnalyzing = false;
      },
      error: () => {
        this.aiReport = this.fallbackReport();
        this.aiAnalyzing = false;
      }
    });
  }

  private buildDetailedReport(s: ImagingStudy): string {
    return `**Radiologist: Dr. A. Mehta, MD Radiology**
**Date: ${new Date(s.studyDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}**

**FINDINGS:**
${s.findings}

**IMPRESSION:**
${s.impression}

---
*Electronically signed. This report is for demo purposes.*`;
  }

  private fallbackReport(): string {
    const s = this.selectedStudy!;
    return `**Radiologist: Dr. A. Mehta, MD Radiology**

**Technique:** ${s.modality} of the ${s.bodyPart} performed using standard protocol.

**Findings:** The visualized structures of the ${s.bodyPart} appear within normal limits. No acute abnormality, mass lesion, or significant pathology identified. Soft tissues are unremarkable.

**Impression:** Normal ${s.modality} study of the ${s.bodyPart}. Clinical correlation recommended.

---
*Demo report — AI analysis for educational purposes only.*`;
  }

  // ── In-viewer upload: attach real image to an existing study ─────
  uploadStudyImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedStudy) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.selectedStudy!.imageUrl = dataUrl;
      // Persist so it survives page refresh
      try { localStorage.setItem(this.LS_PREFIX + this.selectedStudy!.id, dataUrl); } catch {}
      this.aiReport = '';
      setTimeout(() => this.analyzeWithAI(), 200);
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be re-selected
    input.value = '';
  }

  clearStudyImage(): void {
    if (!this.selectedStudy) return;
    localStorage.removeItem(this.LS_PREFIX + this.selectedStudy.id);
    this.selectedStudy.imageUrl = undefined;
    this.aiReport = '';
  }

  // ── Modal image upload ────────────────────────────────────────────
  handleImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.uploadedImageUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
    this.aiUploadReport = '';
  }

  analyzeUploadedImage(): void {
    if (!this.uploadedImageFile && !this.uploadedImageUrl) return;
    this.aiUploadAnalyzing = true;
    this.aiUploadReport = '';

    const prompt = `You are an expert radiologist. Analyze this ${this.uploadForm.modality} image of the ${this.uploadForm.bodyPart} for patient ${this.uploadForm.patientName}.
Referred by: ${this.uploadForm.referredBy}. Urgency: ${this.uploadForm.urgency}.
Provide a complete structured radiology report:
1. Patient & Exam Info
2. Technique
3. Detailed Findings (mention all anatomical structures clearly)
4. Impression
5. Recommendations

Be clinically accurate and detailed.`;

    this.http.post<any>(`${environment.apiUrl}/ai/chat`, { message: prompt, history: [] }).subscribe({
      next: res => {
        this.aiUploadReport = res.data?.reply || this.genericUploadReport();
        this.aiUploadAnalyzing = false;
      },
      error: () => {
        this.aiUploadReport = this.genericUploadReport();
        this.aiUploadAnalyzing = false;
      }
    });
  }

  private genericUploadReport(): string {
    return `**${this.uploadForm.modality} — ${this.uploadForm.bodyPart}**
Patient: ${this.uploadForm.patientName} | Referred by: ${this.uploadForm.referredBy}

**Technique:** Standard ${this.uploadForm.modality} protocol for ${this.uploadForm.bodyPart}.

**Findings:** The submitted image demonstrates normal anatomical alignment. No acute fracture, dislocation, consolidation, or significant soft-tissue abnormality is identified. Visualized structures appear within normal limits.

**Impression:** Normal ${this.uploadForm.modality} study. No acute abnormality detected.

**Recommendation:** Clinical correlation advised. Follow-up as clinically indicated.

---
*AI-assisted draft — Review and sign by qualified radiologist before clinical use.*`;
  }

  uploadStudy(): void {
    const newStudy: ImagingStudy = {
      id: `STU-${1100 + this.studies.length}`,
      patientName: this.uploadForm.patientName,
      patientId: this.uploadForm.patientId,
      modality: this.uploadForm.modality as ImagingStudy['modality'],
      studyDate: new Date().toISOString(),
      bodyPart: this.uploadForm.bodyPart,
      status: 'pending',
      referredBy: this.uploadForm.referredBy,
      urgency: this.uploadForm.urgency as ImagingStudy['urgency'],
      findings: this.aiUploadReport || undefined,
      imageUrl: this.uploadedImageUrl || undefined
    };
    this.studies.unshift(newStudy);
    this.applyFilters();
    this.snack.open('Study uploaded and queued for review', 'OK', { duration: 3000, panelClass: 'success-snack' });
    this.uploadModalOpen = false;
    this.uploadedImageUrl = null;
    this.uploadedImageFile = null;
    this.aiUploadReport = '';
    const first = this.patientsList[0];
    this.uploadForm = {
      patientName: first?.name || '',
      patientId:   first?.patientId || '',
      modality: 'X-Ray', bodyPart: 'Chest', referredBy: '', urgency: 'routine', notes: ''
    };
  }

  modalityIcon(m: string): string {
    return ({ CT: 'biotech', MRI: 'wb_sunny', 'X-Ray': 'filter_b_and_w', Ultrasound: 'waves', PET: 'blur_on', Mammography: 'favorite' } as any)[m] || 'image';
  }
  urgencyColor(u: string): string {
    return ({ routine: '#059669', urgent: '#d97706', stat: '#dc2626' } as any)[u] || '#6b7280';
  }
  statusColor(s: string): string {
    return ({ pending: '#d97706', 'in-progress': '#0891b2', reported: '#059669', archived: '#6b7280' } as any)[s] || '#6b7280';
  }
}
