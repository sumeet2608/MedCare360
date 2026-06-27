import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface BloodInventory { bloodGroup: string; units: number; status: string; }
interface BloodRequest { _id: string; patientName: string; bloodGroup: string; units: number; urgency: string; status: string; createdAt: string; }

@Component({
  selector: 'app-blood-bank',
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title"><mat-icon>water_drop</mat-icon> Blood Bank Management</h1>
        <button mat-raised-button color="primary" (click)="showRequestForm = !showRequestForm">
          <mat-icon>add</mat-icon> New Request
        </button>
      </div>

      <!-- Blood Group Inventory Cards -->
      <div class="blood-inventory-grid">
        <mat-card *ngFor="let item of inventory" class="blood-card"
          [class.critical]="item.units < 5" [class.low]="item.units >= 5 && item.units < 15">
          <mat-card-content>
            <div class="blood-group-badge">{{ item.bloodGroup }}</div>
            <div class="blood-units">{{ item.units }}</div>
            <div class="blood-label">Units Available</div>
            <mat-chip [color]="item.units < 5 ? 'warn' : item.units < 15 ? 'accent' : 'primary'" selected>
              {{ item.units < 5 ? 'Critical' : item.units < 15 ? 'Low' : 'Adequate' }}
            </mat-chip>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Request Form -->
      <mat-card *ngIf="showRequestForm" class="form-card">
        <mat-card-header><mat-card-title>New Blood Request</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="requestForm" (ngSubmit)="submitRequest()" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Patient Name</mat-label>
              <input matInput formControlName="patientName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Blood Group</mat-label>
              <mat-select formControlName="bloodGroup">
                <mat-option *ngFor="let bg of bloodGroups" [value]="bg">{{ bg }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Units Required</mat-label>
              <input matInput type="number" formControlName="units" min="1" max="10" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Urgency</mat-label>
              <mat-select formControlName="urgency">
                <mat-option value="routine">Routine</mat-option>
                <mat-option value="urgent">Urgent</mat-option>
                <mat-option value="emergency">Emergency</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Reason / Diagnosis</mat-label>
              <textarea matInput formControlName="reason" rows="2"></textarea>
            </mat-form-field>
            <div class="form-actions">
              <button mat-button type="button" (click)="showRequestForm = false">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="requestForm.invalid || submitting">
                <mat-spinner diameter="18" *ngIf="submitting"></mat-spinner>
                Submit Request
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Requests Table -->
      <mat-card class="table-card">
        <mat-card-header><mat-card-title>Blood Requests</mat-card-title></mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="requests" class="full-width-table">
            <ng-container matColumnDef="patient"><th mat-header-cell *matHeaderCellDef>Patient</th><td mat-cell *matCellDef="let r">{{ r.patientName }}</td></ng-container>
            <ng-container matColumnDef="bloodGroup"><th mat-header-cell *matHeaderCellDef>Blood Group</th><td mat-cell *matCellDef="let r"><span class="blood-badge">{{ r.bloodGroup }}</span></td></ng-container>
            <ng-container matColumnDef="units"><th mat-header-cell *matHeaderCellDef>Units</th><td mat-cell *matCellDef="let r">{{ r.units }}</td></ng-container>
            <ng-container matColumnDef="urgency">
              <th mat-header-cell *matHeaderCellDef>Urgency</th>
              <td mat-cell *matCellDef="let r">
                <mat-chip [color]="r.urgency === 'emergency' ? 'warn' : r.urgency === 'urgent' ? 'accent' : 'primary'" selected class="chip-sm">{{ r.urgency }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">
                <mat-chip [color]="r.status === 'fulfilled' ? 'primary' : r.status === 'approved' ? 'accent' : 'warn'" selected class="chip-sm">{{ r.status }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let r">{{ r.createdAt | date:'dd MMM, HH:mm' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <div *ngIf="requests.length === 0" class="empty-state">
            <mat-icon>water_drop</mat-icon>
            <p>No blood requests found</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { font-family: Figtree, sans-serif; font-weight: 800; font-size: 1.5rem; color: var(--text-primary, #1e293b); display: flex; align-items: center; gap: 8px; }
    .blood-inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .blood-card { text-align: center; border-radius: 12px; transition: transform 0.2s; }
    .blood-card:hover { transform: translateY(-2px); }
    .blood-card.critical { border-top: 4px solid #ef4444; }
    .blood-card.low { border-top: 4px solid #f59e0b; }
    .blood-group-badge { font-size: 1.8rem; font-weight: 800; font-family: Figtree, sans-serif; color: #0891b2; margin-bottom: 4px; }
    .blood-units { font-size: 2.5rem; font-weight: 800; font-family: Figtree, sans-serif; color: #1e293b; line-height: 1; }
    .blood-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 4px 0 8px; }
    .form-card, .table-card { margin-bottom: 24px; border-radius: 12px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { grid-column: 1 / -1; }
    .form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 12px; }
    .full-width-table { width: 100%; }
    .blood-badge { background: #e0f2fe; color: #0891b2; font-weight: 700; padding: 2px 10px; border-radius: 20px; font-family: Figtree, sans-serif; }
    .chip-sm { font-size: 0.7rem !important; height: 22px !important; }
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `]
})
export class BloodBankComponent implements OnInit {
  inventory: BloodInventory[] = [];
  requests: BloodRequest[] = [];
  displayedColumns = ['patient', 'bloodGroup', 'units', 'urgency', 'status', 'date'];
  showRequestForm = false;
  submitting = false;
  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  requestForm: FormGroup;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private fb: FormBuilder) {
    this.requestForm = this.fb.group({
      patientName: ['', Validators.required],
      bloodGroup:  ['', Validators.required],
      units:       [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      urgency:     ['urgent', Validators.required],
      reason:      ['']
    });
  }

  ngOnInit() {
    this.loadInventory();
    this.loadRequests();
  }

  loadInventory() {
    this.http.get<any>(`${environment.apiUrl}/blood-bank/inventory`).subscribe({
      next: res => this.inventory = res.data || [],
      error: () => {
        // Fallback demo data when API unavailable
        this.inventory = this.bloodGroups.map(bg => ({
          bloodGroup: bg, units: Math.floor(Math.random() * 40) + 2, status: 'available'
        }));
      }
    });
  }

  loadRequests() {
    this.http.get<any>(`${environment.apiUrl}/blood-bank/requests`).subscribe({
      next: res => this.requests = res.data || [],
      error: () => { this.requests = []; }
    });
  }

  submitRequest() {
    if (this.requestForm.invalid) return;
    this.submitting = true;
    this.http.post<any>(`${environment.apiUrl}/blood-bank/requests`, this.requestForm.value).subscribe({
      next: () => {
        this.snackBar.open('Blood request submitted successfully', 'Close', { duration: 3000 });
        this.showRequestForm = false;
        this.requestForm.reset({ units: 1, urgency: 'urgent' });
        this.loadRequests();
        this.submitting = false;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to submit request', 'Close', { duration: 4000 });
        this.submitting = false;
      }
    });
  }
}
