import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface TeleSession {
  _id: string; sessionId: string; doctorName: string; patientName: string;
  scheduledAt: string; status: string; roomUrl: string; type: string;
}

@Component({
  selector: 'app-telemedicine',
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title"><mat-icon>video_call</mat-icon> Telemedicine</h1>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>add</mat-icon> Schedule Consultation
        </button>
      </div>

      <!-- Active Session Banner -->
      <mat-card *ngIf="activeSession" class="active-session-card">
        <mat-card-content class="active-session-content">
          <div class="session-info">
            <mat-icon class="pulse-icon">videocam</mat-icon>
            <div>
              <div class="session-title">Active Session with {{ activeSession.patientName }}</div>
              <div class="session-id">Session ID: {{ activeSession.sessionId }}</div>
            </div>
          </div>
          <div class="session-actions">
            <button mat-raised-button color="primary" (click)="joinSession(activeSession)">
              <mat-icon>video_call</mat-icon> Join Now
            </button>
            <button mat-stroked-button color="warn" (click)="endSession(activeSession)">
              <mat-icon>call_end</mat-icon> End Session
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Schedule Form -->
      <mat-card *ngIf="showForm" class="form-card">
        <mat-card-header><mat-card-title>Schedule Video Consultation</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="sessionForm" (ngSubmit)="scheduleSession()" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Patient Name</mat-label>
              <input matInput formControlName="patientName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Doctor Name</mat-label>
              <input matInput formControlName="doctorName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Consultation Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="follow-up">Follow-up</mat-option>
                <mat-option value="initial">Initial Consultation</mat-option>
                <mat-option value="prescription">Prescription Review</mat-option>
                <mat-option value="report-review">Report Review</mat-option>
                <mat-option value="emergency">Emergency</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Scheduled Date & Time</mat-label>
              <input matInput type="datetime-local" formControlName="scheduledAt" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Chief Complaint / Notes</mat-label>
              <textarea matInput formControlName="chiefComplaint" rows="2"></textarea>
            </mat-form-field>
            <div class="form-actions">
              <button mat-button type="button" (click)="showForm = false">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="sessionForm.invalid || submitting">
                <mat-spinner diameter="18" *ngIf="submitting"></mat-spinner>
                Schedule Session
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Sessions Tabs -->
      <div class="sessions-tabs">
        <button mat-button [class.active-tab]="activeTab === 'upcoming'" (click)="activeTab = 'upcoming'">Upcoming</button>
        <button mat-button [class.active-tab]="activeTab === 'completed'" (click)="activeTab = 'completed'">Completed</button>
      </div>

      <!-- Sessions List -->
      <div class="sessions-grid">
        <mat-card *ngFor="let session of getFilteredSessions()" class="session-card" [class]="'session-' + session.status">
          <mat-card-content>
            <div class="session-card-header">
              <div>
                <div class="session-doctor">Dr. {{ session.doctorName }}</div>
                <div class="session-patient">{{ session.patientName }}</div>
              </div>
              <mat-chip [color]="getStatusColor(session.status)" selected class="chip-sm">
                {{ session.status | titlecase }}
              </mat-chip>
            </div>
            <mat-divider class="divider"></mat-divider>
            <div class="session-meta">
              <div><mat-icon class="meta-icon">schedule</mat-icon> {{ session.scheduledAt | date:'dd MMM yyyy, HH:mm' }}</div>
              <div><mat-icon class="meta-icon">local_hospital</mat-icon> {{ session.type | titlecase }}</div>
              <div><mat-icon class="meta-icon">tag</mat-icon> {{ session.sessionId }}</div>
            </div>
            <div class="session-card-actions">
              <button mat-raised-button color="primary"
                *ngIf="session.status === 'scheduled' || session.status === 'waiting'"
                (click)="joinSession(session)">
                <mat-icon>video_call</mat-icon> Join
              </button>
              <button mat-stroked-button
                *ngIf="session.status === 'active'"
                color="warn"
                (click)="endSession(session)">
                <mat-icon>call_end</mat-icon> End
              </button>
              <button mat-stroked-button
                *ngIf="session.status === 'completed'"
                (click)="viewSummary(session)">
                <mat-icon>description</mat-icon> Summary
              </button>
            </div>
          </mat-card-content>
        </mat-card>
        <div *ngIf="getFilteredSessions().length === 0" class="empty-state">
          <mat-icon>video_call</mat-icon>
          <p>No {{ activeTab }} sessions</p>
        </div>
      </div>

      <!-- Jitsi Video Frame (shown when in session) -->
      <div *ngIf="jitsiRoomUrl" class="video-container">
        <div class="video-header">
          <span>Video Consultation</span>
          <button mat-icon-button (click)="jitsiRoomUrl = null"><mat-icon>close</mat-icon></button>
        </div>
        <iframe [src]="jitsiRoomUrl" allow="camera; microphone; fullscreen" allowfullscreen class="jitsi-frame"></iframe>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { font-family: Figtree, sans-serif; font-weight: 800; font-size: 1.5rem; display: flex; align-items: center; gap: 8px; }
    .active-session-card { margin-bottom: 24px; border-radius: 12px; background: linear-gradient(135deg, #0f172a, #1e3a5f); color: white; }
    .active-session-content { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; }
    .session-info { display: flex; align-items: center; gap: 16px; }
    .session-title { font-size: 1.1rem; font-weight: 700; font-family: Figtree, sans-serif; color: white; }
    .session-id { font-size: 0.8rem; color: #94a3b8; }
    .session-actions { display: flex; gap: 12px; }
    .pulse-icon { animation: pulse 2s infinite; color: #10b981; font-size: 36px; width: 36px; height: 36px; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .form-card { margin-bottom: 24px; border-radius: 12px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { grid-column: 1 / -1; }
    .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 12px; }
    .sessions-tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .active-tab { border-bottom: 2px solid #0891b2; color: #0891b2; font-weight: 600; }
    .sessions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .session-card { border-radius: 12px; border-left: 4px solid #e2e8f0; transition: transform 0.2s; }
    .session-card:hover { transform: translateY(-2px); }
    .session-scheduled { border-left-color: #0891b2; }
    .session-active { border-left-color: #059669; }
    .session-completed { border-left-color: #94a3b8; }
    .session-waiting { border-left-color: #d97706; }
    .session-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .session-doctor { font-size: 1rem; font-weight: 700; font-family: Figtree, sans-serif; }
    .session-patient { font-size: 0.85rem; color: #64748b; }
    .divider { margin: 8px 0; }
    .session-meta { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: #475569; }
    .session-meta div { display: flex; align-items: center; gap: 4px; }
    .meta-icon { font-size: 14px; width: 14px; height: 14px; }
    .session-card-actions { margin-top: 12px; display: flex; gap: 8px; }
    .chip-sm { font-size: 0.7rem !important; height: 22px !important; }
    .empty-state { text-align: center; padding: 60px; color: #94a3b8; grid-column: 1 / -1; }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; }
    .video-container { position: fixed; bottom: 20px; right: 20px; width: 640px; height: 480px; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 1000; background: #000; }
    .video-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #1e293b; color: white; font-weight: 600; }
    .jitsi-frame { width: 100%; height: calc(100% - 44px); border: none; }
  `]
})
export class TelemedicineComponent implements OnInit, OnDestroy {
  sessions: TeleSession[] = [];
  activeSession: TeleSession | null = null;
  jitsiRoomUrl: any = null;
  showForm = false;
  submitting = false;
  activeTab = 'upcoming';
  sessionForm: FormGroup;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private fb: FormBuilder) {
    this.sessionForm = this.fb.group({
      patientName:    ['', Validators.required],
      doctorName:     ['', Validators.required],
      type:           ['follow-up', Validators.required],
      scheduledAt:    ['', Validators.required],
      chiefComplaint: ['']
    });
  }

  ngOnInit() { this.loadSessions(); }
  ngOnDestroy() { this.jitsiRoomUrl = null; }

  loadSessions() {
    this.http.get<any>(`${environment.apiUrl}/telemedicine`).subscribe({
      next: res => {
        this.sessions = res.data || [];
        this.activeSession = this.sessions.find(s => s.status === 'active') || null;
      },
      error: () => {
        const now = new Date();
        this.sessions = [
          { _id: '1', sessionId: 'TELE-001', doctorName: 'Rajesh Kumar', patientName: 'Ananya Sharma', scheduledAt: new Date(now.getTime() + 3600000).toISOString(), status: 'scheduled', roomUrl: '', type: 'follow-up' },
          { _id: '2', sessionId: 'TELE-002', doctorName: 'Meera Nair', patientName: 'Vikram Patel', scheduledAt: new Date(now.getTime() - 86400000).toISOString(), status: 'completed', roomUrl: '', type: 'prescription' }
        ];
      }
    });
  }

  getFilteredSessions() {
    if (this.activeTab === 'upcoming') return this.sessions.filter(s => ['scheduled', 'waiting', 'active'].includes(s.status));
    return this.sessions.filter(s => s.status === 'completed');
  }

  getStatusColor(status: string) {
    const map: Record<string, string> = { active: 'accent', scheduled: 'primary', waiting: 'warn', completed: 'primary' };
    return map[status] || 'primary';
  }

  joinSession(session: TeleSession) {
    this.http.get<any>(`${environment.apiUrl}/telemedicine/${session.sessionId}/join`).subscribe({
      next: res => {
        const url = res.data?.roomUrl || `https://meet.jit.si/medcare360-${session.sessionId}`;
        this.jitsiRoomUrl = url;
        this.activeSession = session;
        this.snackBar.open('Joining video session...', 'Close', { duration: 2000 });
      },
      error: () => {
        const url = `https://meet.jit.si/medcare360-${session.sessionId}`;
        this.jitsiRoomUrl = url;
        this.snackBar.open('Opening Jitsi Meet session', 'Close', { duration: 2000 });
      }
    });
  }

  endSession(session: TeleSession) {
    this.http.post<any>(`${environment.apiUrl}/telemedicine/${session.sessionId}/end`, {}).subscribe({
      next: () => {
        this.snackBar.open('Session ended', 'Close', { duration: 2000 });
        this.jitsiRoomUrl = null;
        this.activeSession = null;
        this.loadSessions();
      },
      error: () => {
        this.jitsiRoomUrl = null;
        this.activeSession = null;
        session.status = 'completed';
      }
    });
  }

  scheduleSession() {
    if (this.sessionForm.invalid) return;
    this.submitting = true;
    this.http.post<any>(`${environment.apiUrl}/telemedicine`, this.sessionForm.value).subscribe({
      next: () => {
        this.snackBar.open('Telemedicine session scheduled', 'Close', { duration: 3000 });
        this.showForm = false;
        this.sessionForm.reset({ type: 'follow-up' });
        this.loadSessions();
        this.submitting = false;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to schedule session', 'Close', { duration: 4000 });
        this.submitting = false;
      }
    });
  }

  viewSummary(session: TeleSession) {
    this.snackBar.open(`Session ${session.sessionId} — View summary in patient records`, 'Close', { duration: 4000 });
  }
}
