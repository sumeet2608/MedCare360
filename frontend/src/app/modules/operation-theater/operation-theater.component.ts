import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface OTBooking {
  _id: string; otRoom: string; procedureName: string; procedureType: string;
  scheduledDate: string; startTime: string; estimatedDuration: number; anesthesiaType: string; status: string;
  patient?: { patientId: string; user?: { firstName: string; lastName: string } };
  surgeon?: { specialization: string; user?: { firstName: string; lastName: string } };
}
interface OTRoom { _id: string; roomNumber: string; type: string; status: string; equipment: string[]; }

@Component({
  selector: 'app-operation-theater',
  template: `
    <div class="page-container fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title"><mat-icon>medical_services</mat-icon> Operation Theater Management</h1>
          <p class="page-sub">{{ rooms.length }} theaters &middot; {{ todayBookings.length }} procedures today</p>
        </div>
        <button mat-raised-button color="primary" (click)="showBookingForm = !showBookingForm">
          <mat-icon>add</mat-icon> Schedule Surgery
        </button>
      </div>

      <!-- OT Rooms Status -->
      <div class="rooms-grid" *ngIf="!loadingRooms && rooms.length">
        <div *ngFor="let room of rooms" class="room-card glass-card" [class]="'room-' + room.status">
          <div class="room-header">
            <span class="room-number">{{ room.roomNumber }}</span>
            <span class="status-chip" [class]="room.status === 'available' ? 'active' : room.status === 'in-use' ? 'pending' : 'cancelled'">{{ room.status | titlecase }}</span>
          </div>
          <div class="room-type"><mat-icon>meeting_room</mat-icon> {{ room.type | titlecase }} OT</div>
          <div class="room-equipment">
            <span class="equip-chip" *ngFor="let eq of room.equipment.slice(0,2)">{{ eq }}</span>
            <span *ngIf="room.equipment.length > 2" class="more-equip">+{{ room.equipment.length - 2 }} more</span>
          </div>
        </div>
      </div>

      <div class="skeleton-grid" *ngIf="loadingRooms">
        <div class="room-card glass-card skeleton" *ngFor="let s of [1,2,3,4,5]">
          <div class="skel-line w-50"></div>
          <div class="skel-line w-70"></div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loadingRooms && rooms.length === 0">
        <mat-icon>meeting_room</mat-icon>
        <p>No operation theaters configured yet</p>
      </div>

      <!-- Booking Form -->
      <mat-card *ngIf="showBookingForm" class="form-card glass-card">
        <mat-card-header><mat-card-title>Schedule Operation</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="bookingForm" (ngSubmit)="submitBooking()" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Operation Theater Room</mat-label>
              <mat-select formControlName="otRoom">
                <mat-option *ngFor="let r of rooms" [value]="r.roomNumber">{{ r.roomNumber }} — {{ r.type | titlecase }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Patient</mat-label>
              <input matInput [formControl]="patientSearchCtrl" [matAutocomplete]="patientAuto" placeholder="Search patient by name...">
              <mat-autocomplete #patientAuto="matAutocomplete" [displayWith]="displayPatient" (optionSelected)="onPatientSelected($event)">
                <mat-option *ngFor="let p of filteredPatients | async" [value]="p">{{ p.name }} ({{ p.patientId }})</mat-option>
              </mat-autocomplete>
              <mat-error *ngIf="!bookingForm.get('patient')?.value">Select a patient from the list</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Surgeon</mat-label>
              <mat-select formControlName="surgeon">
                <mat-option *ngFor="let d of doctors" [value]="d._id">Dr. {{ d.name }} — {{ d.specialization }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Anesthesiologist (optional)</mat-label>
              <mat-select formControlName="anesthesiologist">
                <mat-option [value]="null">None</mat-option>
                <mat-option *ngFor="let d of doctors" [value]="d._id">Dr. {{ d.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Procedure Name</mat-label>
              <input matInput formControlName="procedureName" placeholder="e.g. Appendectomy">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Procedure Type</mat-label>
              <mat-select formControlName="procedureType">
                <mat-option value="elective">Elective</mat-option>
                <mat-option value="emergency">Emergency</mat-option>
                <mat-option value="semi-emergency">Semi-Emergency</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Anesthesia Type</mat-label>
              <mat-select formControlName="anesthesiaType">
                <mat-option value="general">General</mat-option>
                <mat-option value="spinal">Spinal</mat-option>
                <mat-option value="epidural">Epidural</mat-option>
                <mat-option value="local">Local</mat-option>
                <mat-option value="regional">Regional</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Scheduled Date & Time</mat-label>
              <input matInput type="datetime-local" formControlName="scheduledAt" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Duration (minutes)</mat-label>
              <input matInput type="number" formControlName="estimatedDuration" min="30" step="15" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Diagnosis / Notes</mat-label>
              <textarea matInput formControlName="diagnosis" rows="2"></textarea>
            </mat-form-field>
            <div class="form-actions">
              <button mat-button type="button" (click)="showBookingForm = false">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="bookingForm.invalid || submitting">
                <mat-spinner diameter="18" *ngIf="submitting" style="display:inline-block;margin-right:6px"></mat-spinner>
                Schedule Operation
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Today's Schedule -->
      <mat-card class="table-card glass-card">
        <mat-card-header><mat-card-title>Today's OT Schedule</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="loading-row" *ngIf="loadingBookings"><mat-spinner diameter="32"></mat-spinner></div>

          <table mat-table [dataSource]="todayBookings" class="full-width-table" *ngIf="!loadingBookings && todayBookings.length">
            <ng-container matColumnDef="time"><th mat-header-cell *matHeaderCellDef>Time</th><td mat-cell *matCellDef="let b">{{ b.startTime }}</td></ng-container>
            <ng-container matColumnDef="patient"><th mat-header-cell *matHeaderCellDef>Patient</th><td mat-cell *matCellDef="let b">{{ b.patient?.user?.firstName }} {{ b.patient?.user?.lastName }}</td></ng-container>
            <ng-container matColumnDef="surgeon"><th mat-header-cell *matHeaderCellDef>Surgeon</th><td mat-cell *matCellDef="let b">Dr. {{ b.surgeon?.user?.firstName }} {{ b.surgeon?.user?.lastName }}</td></ng-container>
            <ng-container matColumnDef="procedure"><th mat-header-cell *matHeaderCellDef>Procedure</th><td mat-cell *matCellDef="let b">{{ b.procedureName }}</td></ng-container>
            <ng-container matColumnDef="duration"><th mat-header-cell *matHeaderCellDef>Duration</th><td mat-cell *matCellDef="let b">{{ b.estimatedDuration }} min</td></ng-container>
            <ng-container matColumnDef="anesthesia"><th mat-header-cell *matHeaderCellDef>Anesthesia</th><td mat-cell *matCellDef="let b">{{ b.anesthesiaType | titlecase }}</td></ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let b">
                <span class="status-chip" [class]="b.status === 'completed' ? 'active' : b.status === 'in-progress' ? 'pending' : 'cancelled'">{{ b.status }}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <div *ngIf="!loadingBookings && todayBookings.length === 0" class="empty-state">
            <mat-icon>medical_services</mat-icon>
            <p>No operations scheduled for today</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { font-family: Figtree, sans-serif; font-weight: 800; font-size: 1.5rem; display: flex; align-items: center; gap: 8px; margin: 0; }
    .page-sub { color: #64748b; font-size: 0.85rem; margin: 4px 0 0; }

    .glass-card {
      background: rgba(255,255,255,0.78) !important;
      backdrop-filter: blur(18px) saturate(150%);
      -webkit-backdrop-filter: blur(18px) saturate(150%);
      border: 1px solid rgba(255,255,255,0.5) !important;
      box-shadow: 0 2px 0 rgba(255,255,255,0.9) inset, 0 8px 24px rgba(8,145,178,0.08) !important;
    }

    .rooms-grid, .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .room-card { border-radius: 16px; border-left: 4px solid #e2e8f0; padding: 16px; transition: transform 0.2s; }
    .room-card:hover { transform: translateY(-3px); }
    .room-available { border-left-color: #059669; }
    .room-in-use { border-left-color: #ef4444; }
    .room-cleaning { border-left-color: #0891b2; }
    .room-maintenance { border-left-color: #d97706; }
    .room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .room-number { font-size: 1.2rem; font-weight: 800; font-family: Figtree, sans-serif; }
    .room-type { display: flex; align-items: center; gap: 4px; color: #475569; font-size: 0.85rem; margin-bottom: 8px; }
    .room-equipment { display: flex; flex-wrap: wrap; gap: 4px; }
    .equip-chip { font-size: 0.68rem; background: rgba(8,145,178,0.08); color: #0891b2; padding: 2px 8px; border-radius: 8px; font-weight: 600; }
    .more-equip { font-size: 0.7rem; color: #64748b; align-self: center; }

    .skeleton .skel-line { height: 14px; border-radius: 6px; margin-bottom: 8px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: ot-shimmer 1.4s infinite; }
    .skel-line.w-50 { width: 50%; } .skel-line.w-70 { width: 70%; }
    @keyframes ot-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .form-card, .table-card { margin-bottom: 24px; border-radius: 18px !important; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { grid-column: 1 / -1; }
    .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 12px; }
    .full-width-table { width: 100%; }
    .empty-state { text-align: center; padding: 50px 20px; color: #94a3b8; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; margin-bottom: 8px; }
    .loading-row { display: flex; justify-content: center; padding: 30px; }
  `]
})
export class OperationTheaterComponent implements OnInit {
  rooms: OTRoom[] = [];
  todayBookings: OTBooking[] = [];
  doctors: { _id: string; name: string; specialization: string }[] = [];
  patients: { _id: string; name: string; patientId: string }[] = [];

  displayedColumns = ['time', 'patient', 'surgeon', 'procedure', 'duration', 'anesthesia', 'status'];
  showBookingForm = false;
  submitting = false;
  loadingRooms = true;
  loadingBookings = true;
  bookingForm: FormGroup;

  patientSearchCtrl = new FormControl('');
  filteredPatients!: Observable<{ _id: string; name: string; patientId: string }[]>;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private fb: FormBuilder) {
    this.bookingForm = this.fb.group({
      otRoom:               ['', Validators.required],
      patient:              ['', Validators.required],
      surgeon:              ['', Validators.required],
      anesthesiologist:     [null],
      procedureName:        ['', Validators.required],
      procedureType:        ['elective', Validators.required],
      anesthesiaType:       ['general', Validators.required],
      scheduledAt:          ['', Validators.required],
      estimatedDuration:    [120, [Validators.required, Validators.min(30)]],
      diagnosis:            ['']
    });

    this.filteredPatients = this.patientSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : (value as any)?.name || '';
        const term = name.toLowerCase();
        return term.length < 2 ? [] : this.patients.filter(p => p.name.toLowerCase().includes(term)).slice(0, 15);
      })
    );
  }

  ngOnInit() { this.loadRooms(); this.loadTodaySchedule(); this.loadDoctors(); this.loadPatients(); }

  loadRooms() {
    this.loadingRooms = true;
    this.http.get<any>(`${environment.apiUrl}/operation-theater/rooms`).subscribe({
      next: res => { this.rooms = res.data || []; this.loadingRooms = false; },
      error: () => { this.loadingRooms = false; }
    });
  }

  loadTodaySchedule() {
    this.loadingBookings = true;
    this.http.get<any>(`${environment.apiUrl}/operation-theater/today`).subscribe({
      next: res => { this.todayBookings = res.data || []; this.loadingBookings = false; },
      error: () => { this.loadingBookings = false; }
    });
  }

  loadDoctors() {
    this.http.get<any>(`${environment.apiUrl}/doctors?limit=500`).subscribe({
      next: res => {
        this.doctors = (res.data || []).map((d: any) => ({ _id: d._id, name: `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim(), specialization: d.specialization }));
      }
    });
  }

  loadPatients() {
    this.http.get<any>(`${environment.apiUrl}/patients?limit=1000`).subscribe({
      next: res => {
        this.patients = (res.data || []).map((p: any) => ({ _id: p._id, name: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(), patientId: p.patientId }));
      }
    });
  }

  displayPatient = (p: { name: string; patientId: string } | string): string => {
    if (!p) return '';
    return typeof p === 'string' ? p : `${p.name} (${p.patientId})`;
  };

  onPatientSelected(event: any): void {
    this.bookingForm.get('patient')?.setValue(event.option.value._id);
  }

  submitBooking() {
    if (this.bookingForm.invalid) { this.bookingForm.markAllAsTouched(); return; }
    this.submitting = true;
    const v = this.bookingForm.value;
    const scheduledDate = new Date(v.scheduledAt);
    const startTime = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`;

    const payload = {
      otRoom: v.otRoom,
      patient: v.patient,
      surgeon: v.surgeon,
      anesthesiologist: v.anesthesiologist || undefined,
      procedureName: v.procedureName,
      procedureType: v.procedureType,
      anesthesiaType: v.anesthesiaType,
      scheduledDate,
      startTime,
      estimatedDuration: v.estimatedDuration,
      diagnosis: v.diagnosis
    };

    this.http.post<any>(`${environment.apiUrl}/operation-theater/bookings`, payload).subscribe({
      next: () => {
        this.snackBar.open('Operation scheduled successfully', 'Close', { duration: 3000 });
        this.showBookingForm = false;
        this.bookingForm.reset({ procedureType: 'elective', anesthesiaType: 'general', estimatedDuration: 120 });
        this.patientSearchCtrl.setValue('');
        this.loadTodaySchedule();
        this.submitting = false;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Scheduling failed — possible room conflict', 'Close', { duration: 4000 });
        this.submitting = false;
      }
    });
  }
}
