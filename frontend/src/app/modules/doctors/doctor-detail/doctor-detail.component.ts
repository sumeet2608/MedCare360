import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-doctor-detail', templateUrl: './doctor-detail.component.html', styleUrls: ['./doctor-detail.component.scss'] })
export class DoctorDetailComponent implements OnInit {
  doctor: any = null;
  loading = true;
  notFound = false;

  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDate = new Date();
  availability: { available: boolean; slots: string[]; bookedSlots: string[] } | null = null;
  loadingSlots = false;

  readonly days = this.buildDays();

  private readonly GRADIENTS = [
    'linear-gradient(135deg,#0891b2,#0e7490)',
    'linear-gradient(135deg,#059669,#047857)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#d97706,#b45309)',
    'linear-gradient(135deg,#dc2626,#b91c1c)',
    'linear-gradient(135deg,#0284c7,#0369a1)',
    'linear-gradient(135deg,#c026d3,#a21caf)',
    'linear-gradient(135deg,#0891b2,#7c3aed)',
  ];

  initials(first?: string, last?: string): string {
    return `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}`;
  }

  avatarGradient(first?: string, last?: string): string {
    const code = ((first?.charCodeAt(0) || 0) + (last?.charCodeAt(0) || 0)) % this.GRADIENTS.length;
    return this.GRADIENTS[code];
  }

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound = true; this.loading = false; return; }
    this.http.get<any>(`${environment.apiUrl}/doctors/${id}`).subscribe({
      next: res => {
        this.doctor = res.data;
        this.loading = false;
        this.loadAvailability();
      },
      error: () => { this.loading = false; this.notFound = true; }
    });
  }

  stars(rating: number): number[] {
    const full = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, i) => (i < full ? 1 : 0));
  }

  isScheduledDay(day: string): boolean {
    return (this.doctor?.schedule || []).some((s: any) => s.day === day && s.isAvailable !== false);
  }

  scheduleFor(day: string): any {
    return (this.doctor?.schedule || []).find((s: any) => s.day === day);
  }

  private buildDays(): { date: Date; label: string; dayName: string; monthLabel: string; showMonth: boolean }[] {
    let lastMonth = -1;
    return Array.from({ length: 90 }, (_, i) => {
      const date = new Date(Date.now() + i * 86400000);
      const showMonth = date.getMonth() !== lastMonth;
      if (showMonth) lastMonth = date.getMonth();
      return {
        date,
        label: date.toLocaleDateString('en-IN', { day: 'numeric' }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        showMonth
      };
    });
  }

  isSelected(date: Date): boolean {
    return date.toDateString() === this.selectedDate.toDateString();
  }

  loadAvailability(): void {
    if (!this.doctor) return;
    this.loadingSlots = true;
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    this.http.get<any>(`${environment.apiUrl}/doctors/${this.doctor._id}/availability`, { params: { date: dateStr } }).subscribe({
      next: res => { this.availability = res; this.loadingSlots = false; },
      error: () => { this.availability = { available: false, slots: [], bookedSlots: [] }; this.loadingSlots = false; }
    });
  }

  bookSlot(slot: string): void {
    this.router.navigate(['/appointments/new'], {
      queryParams: { doctorId: this.doctor._id, date: this.selectedDate.toISOString().split('T')[0], time: slot }
    });
  }

  editDoctor(): void { this.router.navigate(['/doctors', this.doctor._id, 'edit']); }
  goBack(): void { this.router.navigate(['/doctors']); }
}
