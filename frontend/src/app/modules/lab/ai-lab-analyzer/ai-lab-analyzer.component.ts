import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface AnalyzerField { key: string; label: string; unit: string; }
interface AnalyzerDef { type: string; name: string; icon: string; color: string; fields: AnalyzerField[]; }

@Component({
  selector: 'app-ai-lab-analyzer',
  templateUrl: './ai-lab-analyzer.component.html',
  styleUrls: ['./ai-lab-analyzer.component.scss']
})
export class AiLabAnalyzerComponent {

  readonly analyzers: AnalyzerDef[] = [
    {
      type: 'cbc', name: 'Complete Blood Count', icon: 'opacity', color: '#dc2626',
      fields: [
        { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
        { key: 'hematocrit', label: 'Hematocrit', unit: '%' },
        { key: 'rbc', label: 'RBC', unit: 'million/μL' },
        { key: 'wbc', label: 'WBC', unit: 'cells/μL' },
        { key: 'platelets', label: 'Platelets', unit: 'K/μL' },
        { key: 'mcv', label: 'MCV', unit: 'fL' },
        { key: 'mch', label: 'MCH', unit: 'pg' },
        { key: 'mchc', label: 'MCHC', unit: 'g/dL' },
        { key: 'neutrophils', label: 'Neutrophils', unit: '%' },
        { key: 'lymphocytes', label: 'Lymphocytes', unit: '%' }
      ]
    },
    {
      type: 'lipid', name: 'Lipid Profile', icon: 'favorite', color: '#d97706',
      fields: [
        { key: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL' },
        { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
        { key: 'hdl', label: 'HDL', unit: 'mg/dL' },
        { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL' },
        { key: 'vldl', label: 'VLDL', unit: 'mg/dL' },
        { key: 'nonHdl', label: 'Non-HDL', unit: 'mg/dL' }
      ]
    },
    {
      type: 'lft', name: 'Liver Function Tests', icon: 'science', color: '#7c3aed',
      fields: [
        { key: 'alt', label: 'ALT (SGPT)', unit: 'U/L' },
        { key: 'ast', label: 'AST (SGOT)', unit: 'U/L' },
        { key: 'alp', label: 'Alk. Phosphatase', unit: 'U/L' },
        { key: 'ggt', label: 'GGT', unit: 'U/L' },
        { key: 'bilirubin', label: 'Total Bilirubin', unit: 'mg/dL' },
        { key: 'directBilirubin', label: 'Direct Bilirubin', unit: 'mg/dL' },
        { key: 'albumin', label: 'Albumin', unit: 'g/dL' },
        { key: 'totalProtein', label: 'Total Protein', unit: 'g/dL' },
        { key: 'pt', label: 'Prothrombin Time', unit: 'seconds' }
      ]
    },
    {
      type: 'kft', name: 'Kidney Function Tests', icon: 'water_drop', color: '#0891b2',
      fields: [
        { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL' },
        { key: 'bun', label: 'BUN', unit: 'mg/dL' },
        { key: 'uricAcid', label: 'Uric Acid', unit: 'mg/dL' },
        { key: 'gfr', label: 'eGFR', unit: 'mL/min/1.73m²' },
        { key: 'sodium', label: 'Sodium', unit: 'mEq/L' },
        { key: 'potassium', label: 'Potassium', unit: 'mEq/L' },
        { key: 'chloride', label: 'Chloride', unit: 'mEq/L' },
        { key: 'bicarbonate', label: 'Bicarbonate', unit: 'mEq/L' },
        { key: 'calcium', label: 'Calcium', unit: 'mg/dL' },
        { key: 'phosphorus', label: 'Phosphorus', unit: 'mg/dL' }
      ]
    },
    {
      type: 'diabetes', name: 'Diabetes Assessment', icon: 'show_chart', color: '#059669',
      fields: [
        { key: 'fastingGlucose', label: 'Fasting Glucose', unit: 'mg/dL' },
        { key: 'hba1c', label: 'HbA1c', unit: '%' },
        { key: 'ppGlucose', label: '2hr PP Glucose', unit: 'mg/dL' },
        { key: 'insulin', label: 'Fasting Insulin', unit: 'μIU/mL' },
        { key: 'cPeptide', label: 'C-Peptide', unit: 'ng/mL' },
        { key: 'microalbumin', label: 'Microalbumin/Cr', unit: 'mg/g' }
      ]
    },
    {
      type: 'thyroid', name: 'Thyroid Function', icon: 'psychology', color: '#be185d',
      fields: [
        { key: 'tsh', label: 'TSH', unit: 'mIU/L' },
        { key: 't3', label: 'Total T3', unit: 'ng/dL' },
        { key: 't4', label: 'Total T4', unit: 'μg/dL' },
        { key: 'freeT3', label: 'Free T3', unit: 'pg/mL' },
        { key: 'freeT4', label: 'Free T4', unit: 'ng/dL' },
        { key: 'antiTPO', label: 'Anti-TPO', unit: 'IU/mL' },
        { key: 'antiTg', label: 'Anti-Tg', unit: 'IU/mL' }
      ]
    }
  ];

  selectedType = 'cbc';
  values: Record<string, number | null> = {};
  patientAge: number | null = null;
  patientGender = '';
  clinicalNotes = '';
  isPregnant = false;
  loading = false;
  result: any = null;
  showClinicalSummary = true;

  constructor(private http: HttpClient, private snack: MatSnackBar) {
    this.resetValues();
  }

  get currentAnalyzer(): AnalyzerDef {
    return this.analyzers.find(a => a.type === this.selectedType)!;
  }

  selectType(type: string): void {
    this.selectedType = type;
    this.result = null;
    this.resetValues();
  }

  resetValues(): void {
    this.values = {};
    this.currentAnalyzer?.fields.forEach(f => { this.values[f.key] = null; });
  }

  analyze(): void {
    const filteredValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.values)) {
      if (v !== null && v !== undefined && !isNaN(Number(v))) {
        filteredValues[k] = Number(v);
      }
    }
    if (Object.keys(filteredValues).length === 0) {
      this.snack.open('Enter at least one lab value to analyze', 'Close', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.result = null;
    this.http.post<any>(`${environment.apiUrl}/ai-analyzer/${this.selectedType}`, {
      values: filteredValues,
      patientAge: this.patientAge || undefined,
      patientGender: this.patientGender || undefined,
      clinicalNotes: this.clinicalNotes || undefined,
      isPregnant: this.isPregnant || undefined
    }).subscribe({
      next: res => { this.loading = false; this.result = res.data; },
      error: err => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Analysis failed — check GROQ_API_KEY', 'Close', { duration: 5000 });
      }
    });
  }

  clearAll(): void {
    this.result = null;
    this.patientAge = null;
    this.patientGender = '';
    this.clinicalNotes = '';
    this.isPregnant = false;
    this.resetValues();
  }

  printReport(): void { window.print(); }

  getCriticalCount(): number { return this.result?.criticalValues?.length || 0; }

  getAbnormalCount(): number {
    return (this.result?.analysis?.findings || [])
      .filter((f: any) => f.severity && f.severity !== 'normal').length;
  }

  getSeverityScore(): number {
    const findings = this.result?.analysis?.findings || [];
    if (!findings.length) return 0;
    const weights: Record<string, number> = { normal: 0, mild: 1, moderate: 2, severe: 3 };
    const total = findings.reduce((sum: number, f: any) => sum + (weights[f.severity] || 0), 0);
    return Math.min(100, Math.round((total / (findings.length * 3)) * 100));
  }

  getSeverityScoreColor(): string {
    const s = this.getSeverityScore();
    if (s === 0)  return '#059669';
    if (s < 30)   return '#84cc16';
    if (s < 55)   return '#d97706';
    return '#dc2626';
  }

  getSeverityScoreLabel(): string {
    const s = this.getSeverityScore();
    if (s === 0)  return 'All Normal';
    if (s < 30)   return 'Mildly Abnormal';
    if (s < 55)   return 'Moderately Abnormal';
    return 'Severely Abnormal';
  }

  getConfidence(): number { return this.result?.analysis?.confidence || 0; }

  getConfidenceColor(): string {
    const c = this.getConfidence();
    if (c >= 80) return '#059669';
    if (c >= 60) return '#d97706';
    return '#dc2626';
  }

  getRiskBadge(): { label: string; color: string } | null {
    const a = this.result?.analysis;
    if (!a) return null;
    const val = a.riskLevel || a.status || a.glycemicControl || a.severity;
    if (!val) return null;
    const colorMap: Record<string, string> = {
      low: '#059669', normal: '#059669', euthyroid: '#059669', mild: '#059669',
      moderate: '#d97706', subclinical: '#d97706', prediabetes: '#d97706',
      high: '#dc2626', 'very-high': '#dc2626', severe: '#dc2626',
      t2dm: '#dc2626', t1dm: '#dc2626', hypothyroid: '#dc2626', hyperthyroid: '#dc2626',
      'acute liver failure': '#7f1d1d'
    };
    return { label: String(val), color: colorMap[String(val).toLowerCase()] || '#6b7280' };
  }

  getSeverityClass(severity?: string): string {
    const s = (severity || '').toLowerCase();
    if (s.includes('severe') || s.includes('critical')) return 'sev-high';
    if (s.includes('moderate')) return 'sev-med';
    return 'sev-low';
  }

  formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  ckdStage(): string | null { return this.result?.analysis?.ckdStage || null; }
  riskScore(): number | null { return this.result?.analysis?.riskScore ?? null; }
  liverPattern(): string | null { return this.result?.analysis?.pattern || null; }

  // Safely extract a plain string from whatever the AI returned (string or object)
  asString(item: any): string {
    if (typeof item === 'string') return item;
    if (!item) return '';
    return item.flag || item.message || item.text || item.action ||
           item.recommendation || item.finding || item.description ||
           (item.parameter && item.interpretation ? `${item.parameter}: ${item.interpretation}` : '') ||
           JSON.stringify(item);
  }
}
