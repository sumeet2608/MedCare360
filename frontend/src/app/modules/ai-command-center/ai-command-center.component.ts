import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface CommandEntry {
  question: string;
  answer?: string;
  toolUsed?: string | null;
  toolData?: any;
  loading: boolean;
  error?: string;
}

@Component({ selector: 'app-ai-command-center', templateUrl: './ai-command-center.component.html', styleUrls: ['./ai-command-center.component.scss'] })
export class AiCommandCenterComponent implements OnInit {
  readonly Object = Object;
  query = '';
  suggestions: string[] = [];
  history: CommandEntry[] = [];
  running = false;

  toolIcons: Record<string, string> = {
    get_todays_appointments: 'calendar_today',
    get_low_stock_medicines: 'medication',
    find_available_doctors: 'medical_services',
    generate_patient_summary: 'person',
    get_recent_lab_reports: 'biotech',
    get_operational_insights: 'insights'
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/command/suggestions`).subscribe({
      next: res => { this.suggestions = res.data || []; },
      error: () => {}
    });
  }

  ask(text?: string): void {
    const question = (text ?? this.query).trim();
    if (!question || this.running) return;
    this.running = true;
    this.query = '';

    const entry: CommandEntry = { question, loading: true };
    this.history.unshift(entry);

    this.http.post<any>(`${environment.apiUrl}/ai/command`, { message: question }).subscribe({
      next: res => {
        entry.answer = res.data?.answer;
        entry.toolUsed = res.data?.toolUsed;
        entry.toolData = res.data?.toolData;
        entry.loading = false;
        this.running = false;
      },
      error: (err) => {
        entry.error = err.error?.message || 'Something went wrong running that command.';
        entry.loading = false;
        this.running = false;
      }
    });
  }

  toolLabel(tool: string | null | undefined): string {
    if (!tool) return '';
    return tool.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  isArrayResult(data: any): boolean { return Array.isArray(data); }
  isObjectResult(data: any): boolean { return !!data && !Array.isArray(data) && typeof data === 'object'; }

  objectEntries(obj: any): { key: string; value: any }[] {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([k]) => !['found', 'recentAppointments', 'allergies', 'chronicConditions', 'latestVitals'].includes(k))
      .map(([key, value]) => ({ key, value }));
  }
}
