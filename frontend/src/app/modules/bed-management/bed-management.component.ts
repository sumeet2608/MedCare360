import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface Bed { _id: string; bedNumber: string; ward: string; floor: number; type: string; status: string; patientName?: string; admittedAt?: string; }
interface OccupancyStats { total: number; occupied: number; available: number; maintenance: number; occupancyRate: number; }

@Component({
  selector: 'app-bed-management',
  template: `
    <div class="bed-page">
      <div class="page-header">
        <div>
          <h1 class="page-title"><mat-icon>bed</mat-icon> Bed Management</h1>
          <p class="page-sub">Create and manage hospital beds by ward</p>
        </div>
        <button mat-raised-button class="btn-add" (click)="showCreateForm = !showCreateForm">
          <mat-icon>add</mat-icon> Add Beds
        </button>
      </div>

      <!-- Create Beds Form -->
      <mat-card class="create-card" *ngIf="showCreateForm">
        <mat-card-header><mat-card-title>Add New Beds</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="createForm" (ngSubmit)="createBeds()" class="create-form">
            <mat-form-field appearance="outline">
              <mat-label>Ward Name</mat-label>
              <input matInput formControlName="ward" placeholder="e.g. ICU, General Ward A">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Bed Type</mat-label>
              <mat-select formControlName="type">
                <mat-option *ngFor="let t of bedTypes" [value]="t">{{ t | titlecase }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Floor</mat-label>
              <input matInput type="number" formControlName="floor" placeholder="1">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Number of Beds</mat-label>
              <input matInput type="number" formControlName="count" placeholder="10" min="1" max="100">
              <mat-hint>Creates beds numbered sequentially (e.g. ICU-001, ICU-002…)</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Daily Rate (₹)</mat-label>
              <input matInput type="number" formControlName="dailyRate" placeholder="1500">
            </mat-form-field>
            <div class="form-actions full-col">
              <button mat-button type="button" (click)="showCreateForm = false">Cancel</button>
              <button mat-raised-button class="btn-add" type="submit" [disabled]="createForm.invalid || creating">
                <mat-spinner *ngIf="creating" diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
                Create Beds
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Stats -->
      <div class="stats-grid" *ngIf="beds.length > 0">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon blue"><mat-icon>bed</mat-icon></div>
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">Total Beds</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon red"><mat-icon>person</mat-icon></div>
            <div class="stat-value">{{ stats.occupied }}</div>
            <div class="stat-label">Occupied</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon green"><mat-icon>check_circle</mat-icon></div>
            <div class="stat-value">{{ stats.available }}</div>
            <div class="stat-label">Available</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon amber"><mat-icon>build</mat-icon></div>
            <div class="stat-value">{{ stats.maintenance }}</div>
            <div class="stat-label">Maintenance</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Occupancy Rate Bar -->
      <mat-card class="occupancy-card" *ngIf="beds.length > 0">
        <mat-card-content>
          <div class="occupancy-header">
            <span>Overall Occupancy Rate</span>
            <strong>{{ stats.occupancyRate | number:'1.0-0' }}%</strong>
          </div>
          <mat-progress-bar mode="determinate" [value]="stats.occupancyRate"
            [color]="stats.occupancyRate > 85 ? 'warn' : stats.occupancyRate > 70 ? 'accent' : 'primary'">
          </mat-progress-bar>
        </mat-card-content>
      </mat-card>

      <!-- Filter -->
      <mat-card class="filter-card" *ngIf="beds.length > 0">
        <mat-card-content class="filter-row">
          <span class="filter-label">Filter by Type:</span>
          <mat-chip-listbox [(ngModel)]="selectedType" (change)="filterBeds()">
            <mat-chip-option value="">All</mat-chip-option>
            <mat-chip-option *ngFor="let t of bedTypes" [value]="t">{{ t | titlecase }}</mat-chip-option>
          </mat-chip-listbox>
          <mat-form-field appearance="outline" class="ward-filter">
            <mat-label>Ward</mat-label>
            <mat-select [(ngModel)]="selectedWard" (selectionChange)="filterBeds()">
              <mat-option value="">All Wards</mat-option>
              <mat-option *ngFor="let w of wards" [value]="w">{{ w }}</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Loading beds…</p>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading && beds.length === 0">
        <mat-icon class="empty-icon">bed</mat-icon>
        <h2>No Beds Created Yet</h2>
        <p>Use the "Add Beds" button above to create hospital beds by ward. Beds start empty and can be assigned to patients after creation.</p>
        <button mat-raised-button class="btn-add" (click)="showCreateForm = true">
          <mat-icon>add</mat-icon> Create First Beds
        </button>
      </div>

      <!-- Bed Grid -->
      <div class="bed-grid" *ngIf="!loading && filteredBeds.length > 0">
        <div *ngFor="let bed of filteredBeds" class="bed-card" [class]="'bed-' + bed.status">
          <div class="bed-number">{{ bed.bedNumber }}</div>
          <mat-icon class="bed-icon">{{ bed.status === 'occupied' ? 'person' : bed.status === 'maintenance' ? 'build' : 'bed' }}</mat-icon>
          <div class="bed-ward">{{ bed.ward }}</div>
          <div class="bed-type">{{ bed.type | titlecase }}</div>
          <div class="bed-patient" *ngIf="bed.patientName">{{ bed.patientName }}</div>
          <button mat-stroked-button class="bed-action-btn" *ngIf="bed.status === 'available'" (click)="assignBed(bed)">Assign</button>
          <button mat-stroked-button class="bed-action-btn" *ngIf="bed.status === 'occupied'" (click)="dischargeBed(bed)">Discharge</button>
        </div>
      </div>
      <div *ngIf="!loading && beds.length > 0 && filteredBeds.length === 0" class="empty-filter">
        <mat-icon>search_off</mat-icon>
        <p>No beds match the current filter</p>
      </div>
    </div>
  `,
  styles: [`
    .bed-page { padding-bottom: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-title { font-family: Figtree, sans-serif; font-weight: 800; font-size: 1.65rem; display: flex; align-items: center; gap: 8px; margin: 0 0 4px; }
    .page-sub { color: #64748b; font-size: 0.875rem; margin: 0; }
    .btn-add { background: linear-gradient(135deg, #0891b2, #0e7490) !important; color: white !important; border-radius: 10px !important; font-weight: 600 !important; }
    .create-card { margin-bottom: 24px; border-radius: 16px !important; border: 2px dashed #0891b2 !important; background: #f0f9ff !important; }
    .create-card mat-card-title { color: #0e7490; font-family: Figtree, sans-serif; }
    .create-form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 16px; padding-top: 8px; }
    .create-form mat-form-field { width: 100%; }
    .full-col { grid-column: 1 / -1; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .stat-card { border-radius: 12px !important; }
    .stat-card mat-card-content { display: flex; flex-direction: column; align-items: center; padding: 20px; }
    .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .stat-icon.blue { background: #e0f2fe; color: #0891b2; }
    .stat-icon.red  { background: #fee2e2; color: #ef4444; }
    .stat-icon.green{ background: #d1fae5; color: #059669; }
    .stat-icon.amber{ background: #fef3c7; color: #d97706; }
    .stat-value { font-size: 2rem; font-weight: 800; font-family: Figtree, sans-serif; }
    .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .occupancy-card, .filter-card { margin-bottom: 16px; border-radius: 12px !important; }
    .occupancy-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-family: Figtree, sans-serif; }
    .filter-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 12px 16px; }
    .filter-label { font-weight: 600; color: #475569; white-space: nowrap; }
    .ward-filter { min-width: 160px; }
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; gap: 16px; color: #94a3b8; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; text-align: center; gap: 16px; }
    .empty-icon { font-size: 72px; width: 72px; height: 72px; color: #cbd5e1; }
    .empty-state h2 { font-family: Figtree, sans-serif; font-weight: 700; color: #475569; margin: 0; }
    .empty-state p { color: #94a3b8; max-width: 400px; margin: 0; line-height: 1.6; }
    .empty-filter { text-align: center; padding: 40px; color: #94a3b8; mat-icon { font-size: 40px; width: 40px; height: 40px; display: block; margin: 0 auto 8px; } }
    .bed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
    .bed-card { border-radius: 10px; padding: 12px; text-align: center; border: 2px solid transparent; transition: all 0.2s; cursor: pointer; }
    .bed-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .bed-available  { background: #f0fdf4; border-color: #86efac; }
    .bed-occupied   { background: #fef2f2; border-color: #fca5a5; }
    .bed-maintenance{ background: #fffbeb; border-color: #fcd34d; }
    .bed-cleaning   { background: #eff6ff; border-color: #93c5fd; }
    .bed-reserved   { background: #f5f3ff; border-color: #c4b5fd; }
    .bed-number { font-size: 1.1rem; font-weight: 800; font-family: Figtree, sans-serif; }
    .bed-icon { font-size: 28px; width: 28px; height: 28px; margin: 6px 0; }
    .bed-ward { font-size: 0.65rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .bed-type { font-size: 0.7rem; color: #475569; font-weight: 600; }
    .bed-patient { font-size: 0.7rem; color: #1e293b; font-weight: 700; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bed-action-btn { margin-top: 6px; font-size: 0.7rem; height: 24px; line-height: 24px; }
    @media (max-width: 640px) { .stats-grid { grid-template-columns: repeat(2,1fr); } .create-form { grid-template-columns: 1fr; } }
  `]
})
export class BedManagementComponent implements OnInit {
  beds: Bed[] = [];
  filteredBeds: Bed[] = [];
  stats: OccupancyStats = { total: 0, occupied: 0, available: 0, maintenance: 0, occupancyRate: 0 };
  bedTypes = ['general', 'icu', 'emergency', 'private', 'semi-private', 'nicu', 'pediatric'];
  wards: string[] = [];
  selectedType = '';
  selectedWard = '';
  loading = true;
  showCreateForm = false;
  creating = false;
  createForm!: FormGroup;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private fb: FormBuilder) {}

  ngOnInit() {
    this.createForm = this.fb.group({
      ward:      ['', Validators.required],
      type:      ['general', Validators.required],
      floor:     [1, [Validators.required, Validators.min(1)]],
      count:     [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      dailyRate: [1500]
    });
    this.loadBeds();
  }

  loadBeds() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/beds`).subscribe({
      next: res => {
        this.beds = res.data || [];
        this.wards = [...new Set(this.beds.map((b: Bed) => b.ward))];
        this.filterBeds();
        this.computeStats();
        this.loading = false;
      },
      error: () => {
        this.beds = [];
        this.filteredBeds = [];
        this.loading = false;
      }
    });
  }

  computeStats() {
    const total = this.beds.length;
    const occupied    = this.beds.filter(b => b.status === 'occupied').length;
    const available   = this.beds.filter(b => b.status === 'available').length;
    const maintenance = this.beds.filter(b => b.status === 'maintenance').length;
    this.stats = { total, occupied, available, maintenance, occupancyRate: total ? (occupied / total) * 100 : 0 };
  }

  filterBeds() {
    this.filteredBeds = this.beds.filter(b =>
      (!this.selectedType || b.type === this.selectedType) &&
      (!this.selectedWard || b.ward === this.selectedWard)
    );
  }

  createBeds() {
    if (this.createForm.invalid) return;
    this.creating = true;
    const { ward, type, floor, count, dailyRate } = this.createForm.value;
    const prefix = ward.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const requests = Array.from({ length: count }, (_, i) => ({
      bedNumber: `${prefix}-${String(i + 1).padStart(3, '0')}`,
      ward, type, floor, dailyRate, status: 'available'
    }));

    let done = 0;
    let errors = 0;
    requests.forEach(payload => {
      this.http.post(`${environment.apiUrl}/beds`, payload).subscribe({
        next: () => {
          done++;
          if (done + errors === requests.length) this.onCreateDone(done, errors);
        },
        error: () => {
          errors++;
          if (done + errors === requests.length) this.onCreateDone(done, errors);
        }
      });
    });
  }

  private onCreateDone(done: number, errors: number) {
    this.creating = false;
    this.showCreateForm = false;
    this.snackBar.open(`${done} bed(s) created${errors ? ', ' + errors + ' failed' : ''}`, 'Close', { duration: 4000 });
    this.createForm.reset({ type: 'general', floor: 1, count: 10, dailyRate: 1500 });
    this.loadBeds();
  }

  assignBed(bed: Bed) {
    const patientName = prompt('Enter patient name:');
    if (!patientName) return;
    this.http.patch(`${environment.apiUrl}/beds/${bed._id}/status`, { status: 'occupied', patientName }).subscribe({
      next: () => { this.snackBar.open('Bed assigned', 'Close', { duration: 2000 }); this.loadBeds(); },
      error: () => { bed.status = 'occupied'; bed.patientName = patientName; this.filterBeds(); }
    });
  }

  dischargeBed(bed: Bed) {
    this.http.patch(`${environment.apiUrl}/beds/${bed._id}/status`, { status: 'cleaning' }).subscribe({
      next: () => { this.snackBar.open('Patient discharged', 'Close', { duration: 2000 }); this.loadBeds(); },
      error: () => { bed.status = 'available'; bed.patientName = undefined; this.filterBeds(); }
    });
  }
}
