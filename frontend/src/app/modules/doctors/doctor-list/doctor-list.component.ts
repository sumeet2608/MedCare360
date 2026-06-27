import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-doctor-list', templateUrl: './doctor-list.component.html', styleUrls: ['./doctor-list.component.scss'] })
export class DoctorListComponent implements OnInit {
  doctors: any[] = [];
  filtered: any[] = [];
  loading = true;
  total = 0;
  searchTerm = '';
  activeSpecialization = 'All';
  sortBy: 'rating' | 'experience' | 'fee-low' | 'fee-high' = 'rating';

  specializations = [
    'All', 'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics',
    'ENT', 'Psychiatry', 'Nephrology', 'Oncology', 'Pulmonology',
    'Gastroenterology', 'Gynecology', 'Ophthalmology', 'Urology', 'General Medicine'
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/doctors?limit=500`).subscribe({
      next: res => {
        this.doctors = res.data || [];
        this.total = res.total ?? this.doctors.length;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setSpecialization(spec: string): void {
    this.activeSpecialization = spec;
    this.applyFilters();
  }

  setSort(value: 'rating' | 'experience' | 'fee-low' | 'fee-high'): void {
    this.sortBy = value;
    this.applyFilters();
  }

  onSearch(value: string): void {
    this.searchTerm = value.trim().toLowerCase();
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.doctors];
    if (this.activeSpecialization !== 'All') {
      list = list.filter(d => d.specialization === this.activeSpecialization);
    }
    if (this.searchTerm) {
      list = list.filter(d =>
        `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(this.searchTerm) ||
        d.specialization?.toLowerCase().includes(this.searchTerm)
      );
    }
    switch (this.sortBy) {
      case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'experience': list.sort((a, b) => (b.experience || 0) - (a.experience || 0)); break;
      case 'fee-low': list.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0)); break;
      case 'fee-high': list.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0)); break;
    }
    this.filtered = list;
  }

  specCount(spec: string): number {
    if (spec === 'All') return this.doctors.length;
    return this.doctors.filter(d => d.specialization === spec).length;
  }

  stars(rating: number): number[] {
    const full = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, i) => (i < full ? 1 : 0));
  }

  private readonly AVATAR_GRADIENTS = [
    'linear-gradient(135deg,#0891b2,#0e7490)',
    'linear-gradient(135deg,#059669,#047857)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#d97706,#b45309)',
    'linear-gradient(135deg,#dc2626,#b91c1c)',
    'linear-gradient(135deg,#0284c7,#0369a1)',
    'linear-gradient(135deg,#c026d3,#a21caf)',
    'linear-gradient(135deg,#0891b2,#7c3aed)',
  ];

  initials(first: string = '', last: string = ''): string {
    return `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}`;
  }

  avatarGradient(first: string = '', last: string = ''): string {
    const code = ((first.charCodeAt(0) || 0) + (last.charCodeAt(0) || 0)) % this.AVATAR_GRADIENTS.length;
    return this.AVATAR_GRADIENTS[code];
  }

  viewDoctor(id: string): void { this.router.navigate(['/doctors', id]); }
  editDoctor(id: string, e: Event): void { e.stopPropagation(); this.router.navigate(['/doctors', id, 'edit']); }
  bookAppointment(id: string, e: Event): void { e.stopPropagation(); this.router.navigate(['/appointments/new'], { queryParams: { doctorId: id } }); }
}
