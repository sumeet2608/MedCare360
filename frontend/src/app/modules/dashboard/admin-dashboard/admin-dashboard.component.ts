import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: any = {};
  revenueData: ChartData<'line'> = { labels: [], datasets: [] };
  appointmentData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  loading = true;
  aiInsight = '';
  aiInsightLoading = false;
  currentTime = new Date();

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { display: true }, title: { display: true, text: 'Monthly Revenue' } },
    scales: { y: { beginAtZero: true } }
  };

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Appointment Status' } }
  };

  statCards = [
    { key: 'totalPatients',       label: 'Total Patients',       icon: 'people',           accentColor: '#0891b2', iconBg: '#e0f2fe', route: '/patients',     trend: 12,  trendLabel: 'last month' },
    { key: 'totalDoctors',        label: 'Active Doctors',       icon: 'medical_services', accentColor: '#059669', iconBg: '#d1fae5', route: '/doctors',      trend: 0,   trendLabel: 'no change' },
    { key: 'admittedPatients',    label: 'Admitted Patients',    icon: 'hotel',            accentColor: '#d97706', iconBg: '#fef3c7', route: '/patients',     trend: -3,  trendLabel: 'yesterday' },
    { key: 'todayAppointments',   label: "Today's Appointments", icon: 'calendar_today',   accentColor: '#7c3aed', iconBg: '#ede9fe', route: '/appointments', trend: 8,   trendLabel: 'yesterday' },
    { key: 'monthlyRevenue',      label: 'Monthly Revenue',      icon: 'currency_rupee',   accentColor: '#059669', iconBg: '#d1fae5', route: '/billing',      trend: 22,  trendLabel: 'last month', prefix: '₹' },
    { key: 'pendingBills',        label: 'Pending Bills',        icon: 'receipt_long',     accentColor: '#dc2626', iconBg: '#fee2e2', route: '/billing',      trend: -5,  trendLabel: 'clearing' },
    { key: 'lowStockMedicines',   label: 'Low Stock Alerts',     icon: 'warning',          accentColor: '#d97706', iconBg: '#fef3c7', route: '/pharmacy',     trend: 2,   trendLabel: 'attention' },
    { key: 'monthlyAppointments', label: 'Monthly Appointments', icon: 'event_note',       accentColor: '#0891b2', iconBg: '#e0f2fe', route: '/appointments', trend: 15,  trendLabel: 'last month' }
  ];

  quickActions = [
    { label: 'Book Appointment', icon: 'calendar_today',   route: '/appointments/new', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', shadow: 'rgba(8,145,178,0.35)' },
    { label: 'Register Patient', icon: 'person_add',       route: '/patients/new',     gradient: 'linear-gradient(135deg,#059669,#047857)', shadow: 'rgba(5,150,105,0.35)' },
    { label: 'Generate Invoice', icon: 'receipt',          route: '/billing/new',      gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', shadow: 'rgba(124,58,237,0.35)' },
    { label: 'Emergency Guide',  icon: 'local_hospital',   route: '/emergency',        gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', shadow: 'rgba(220,38,38,0.35)' },
    { label: 'AI Assistant',     icon: 'smart_toy',        route: '/ai-assistant',     gradient: 'linear-gradient(135deg,#1d4ed8,#1e40af)', shadow: 'rgba(29,78,216,0.35)' },
    { label: 'Scan Medicine',    icon: 'document_scanner', route: '/medicine-scanner', gradient: 'linear-gradient(135deg,#0891b2,#7c3aed)', shadow: 'rgba(8,145,178,0.25)' }
  ];

  constructor(private http: HttpClient, public router: Router) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRevenueChart();
    this.loadAppointmentStats();
    setInterval(() => this.currentTime = new Date(), 1000);
  }

  loadStats(): void {
    this.http.get<any>(`${environment.apiUrl}/analytics/dashboard`).subscribe({
      next: res => {
        this.stats = res.data;
        this.loading = false;
        this.loadAiInsight();
      },
      error: () => { this.loading = false; this.loadAiInsight(); }
    });
  }

  loadRevenueChart(): void {
    this.http.get<any>(`${environment.apiUrl}/analytics/revenue?period=monthly`).subscribe({
      next: res => {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        this.revenueData = {
          labels: res.data.map((d: any) => months[d._id - 1] || d._id),
          datasets: [{
            label: 'Revenue (₹)',
            data: res.data.map((d: any) => d.total),
            borderColor: '#1565c0',
            backgroundColor: 'rgba(21,101,192,0.1)',
            fill: true,
            tension: 0.4
          }]
        };
      }
    });
  }

  loadAppointmentStats(): void {
    this.http.get<any>(`${environment.apiUrl}/analytics/appointments`).subscribe({
      next: res => {
        const statusColors: Record<string, string> = {
          scheduled: '#ff9800', confirmed: '#2196f3', completed: '#4caf50',
          cancelled: '#f44336', in_progress: '#9c27b0', no_show: '#607d8b'
        };
        const breakdown = res.data.statusBreakdown || [];
        this.appointmentData = {
          labels: breakdown.map((d: any) => d._id),
          datasets: [{
            data: breakdown.map((d: any) => d.count),
            backgroundColor: breakdown.map((d: any) => statusColors[d._id] || '#90a4ae')
          }]
        };
      }
    });
  }

  loadAiInsight(): void {
    this.aiInsightLoading = true;
    const context = `Hospital stats: ${this.stats.totalPatients || 3} patients registered, ${this.stats.totalDoctors || 3} active doctors, ${this.stats.todayAppointments || 0} appointments today, ${this.stats.lowStockMedicines || 0} low stock medicines.`;
    this.http.post<any>(`${environment.apiUrl}/ai/chat`, {
      message: `As a hospital management AI, give me 2-3 short actionable insights for today based on this data: ${context}. Keep it under 80 words, practical and specific.`,
      history: []
    }).subscribe({
      next: res => { this.aiInsight = res.data.reply; this.aiInsightLoading = false; },
      error: () => {
        this.aiInsight = 'Review today\'s appointments, check medicine stock levels, and ensure all admitted patients have updated records.';
        this.aiInsightLoading = false;
      }
    });
  }

  formatValue(card: any): string {
    const val = this.stats[card.key] ?? 0;
    if (card.prefix === '₹') return `₹${Number(val).toLocaleString('en-IN')}`;
    return String(val);
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }
}
