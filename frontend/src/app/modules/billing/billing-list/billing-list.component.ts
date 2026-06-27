import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { GridColumn } from '../../../shared/components/data-grid/data-grid.component';

@Component({ selector: 'app-billing-list', templateUrl: './billing-list.component.html' })
export class BillingListComponent implements OnInit {
  invoices: any[] = [];
  filteredInvoices: any[] = [];
  loading = true;
  total = 0;
  stats: any = {};
  categoryFilter = 'all';
  // Default: show only pending/unpaid; toggle to show cleared
  statusView: 'pending' | 'all' | 'cleared' = 'pending';
  categoryBreakdown: { category: string; label: string; count: number; amount: number; icon: string; color: string }[] = [];

  readonly categoryMeta: Record<string, { label: string; icon: string; color: string }> = {
    consultation: { label: 'Consultation',  icon: 'stethoscope',     color: '#0891b2' },
    procedure:    { label: 'Procedures',    icon: 'medical_services', color: '#7c3aed' },
    medicine:     { label: 'Medicines',     icon: 'medication',      color: '#059669' },
    lab_test:     { label: 'Lab Tests',     icon: 'science',         color: '#d97706' },
    room:         { label: 'Room / Bed',    icon: 'king_bed',        color: '#0284c7' },
    nursing:      { label: 'Nursing',       icon: 'local_hospital',  color: '#db2777' },
    ambulance:    { label: 'Ambulance',     icon: 'airport_shuttle', color: '#dc2626' },
    equipment:    { label: 'Equipment',     icon: 'biotech',         color: '#6b7280' },
    other:        { label: 'Other / Reg.', icon: 'receipt_long',    color: '#92400e' }
  };

  columns: GridColumn[] = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'patientName',   label: 'Patient',  sortable: true },
    { key: 'category',      label: 'Category' },
    { key: 'totalAmount',   label: 'Total',    type: 'currency', sortable: true },
    { key: 'paidAmount',    label: 'Paid',     type: 'currency', sortable: true },
    { key: 'dueAmount',     label: 'Due',      type: 'currency', sortable: true },
    { key: 'status',        label: 'Status' },
    { key: 'createdAt',     label: 'Date',     type: 'date', sortable: true },
    { key: 'actions',       label: 'Actions' },
  ];

  constructor(private api: ApiService, private router: Router, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); this.loadStats(); }

  load(): void {
    this.loading = true;
    this.api.getBillings().subscribe({
      next: res => {
        this.invoices = (res.data || []).map((b: any) => {
          const primaryCat = b.items?.[0]?.category || 'other';
          return { ...b,
            patientName: `${b.patient?.user?.firstName || ''} ${b.patient?.user?.lastName || ''}`.trim(),
            primaryCategory: primaryCat, category: primaryCat,
            isCleared: !!(b.clearedAt || (b.status === 'paid' && b.dueAmount === 0))
          };
        });
        this.total = res.total || 0;
        this.buildBreakdown();
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildBreakdown(): void {
    const source = this.invoices.filter(i => !i.isCleared); // breakdown only on unpaid
    const map: Record<string, { count: number; amount: number }> = {};
    for (const inv of source) {
      const cat = inv.primaryCategory || 'other';
      if (!map[cat]) map[cat] = { count: 0, amount: 0 };
      map[cat].count++;
      map[cat].amount += inv.totalAmount || 0;
    }
    this.categoryBreakdown = Object.entries(map)
      .map(([cat, v]) => ({ category: cat, label: this.categoryMeta[cat]?.label || cat, icon: this.categoryMeta[cat]?.icon || 'receipt', color: this.categoryMeta[cat]?.color || '#6b7280', count: v.count, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  applyFilter(): void {
    let base = this.invoices;
    // Status view filter
    if (this.statusView === 'pending') base = base.filter(i => !i.isCleared);
    else if (this.statusView === 'cleared') base = base.filter(i => i.isCleared);
    // Category filter on top
    this.filteredInvoices = this.categoryFilter === 'all'
      ? base
      : base.filter(i => i.primaryCategory === this.categoryFilter);
  }

  setStatusView(v: 'pending' | 'all' | 'cleared'): void {
    this.statusView = v;
    this.categoryFilter = 'all';
    this.applyFilter();
  }

  setFilter(cat: string): void { this.categoryFilter = cat; this.applyFilter(); }

  resetting = false;
  get pendingCount():  number { return this.invoices.filter(i => !i.isCleared).length; }
  get clearedCount():  number { return this.invoices.filter(i => i.isCleared).length; }

  archiveCleared(): void {
    if (!confirm(`Archive all ${this.clearedCount} cleared invoice(s)? They will be removed from the active list and the Cleared count resets to 0.`)) return;
    this.resetting = true;
    this.api.post('/admin/billing/archive-cleared', {}).subscribe({
      next: (res: any) => {
        this.resetting = false;
        this.snack.open(res.message || 'Cleared invoices archived', 'Close', { duration: 3000, panelClass: 'success-snack' });
        this.load(); this.loadStats();
      },
      error: () => { this.resetting = false; }
    });
  }

  resetRevenue(): void {
    if (!confirm('RESET REVENUE: Archive ALL invoices including pending?\n\nThis will:\n• Remove all invoices from active view\n• Reset monthly revenue to ₹0\n• Reset all stats to zero\n\nThis cannot be undone easily. Continue?')) return;
    this.resetting = true;
    this.api.post('/admin/billing/reset-revenue', {}).subscribe({
      next: (res: any) => {
        this.resetting = false;
        this.snack.open(res.message || 'Revenue reset to ₹0', 'Close', { duration: 4000, panelClass: 'success-snack' });
        this.load(); this.loadStats();
      },
      error: () => { this.resetting = false; }
    });
  }

  loadStats(): void {
    this.api.getBillingStats().subscribe({ next: res => this.stats = res.data, error: () => {} });
  }

  recordPayment(id: string): void {
    const amount = prompt('Enter payment amount (₹):');
    if (!amount || isNaN(+amount)) return;
    const method = prompt('Payment method (cash/card/upi/insurance):') || 'cash';
    this.api.patch(`/billing/${id}/payment`, { amount: +amount, paymentMethod: method }, 'Payment recorded!')
      .subscribe({ next: () => { this.load(); this.loadStats(); }, error: () => {} });
  }

  view(id: string): void { this.router.navigate(['/billing', id]); }

  getStatusClass(s: string): string {
    const m: Record<string, string> = { paid: 'active', pending: 'pending', partial: 'pending', overdue: 'cancelled', cancelled: 'cancelled' };
    return m[s] || 'pending';
  }

  getCategoryLabel(cat: string): string { return this.categoryMeta[cat]?.label || cat; }
  getCategoryColor(cat: string): string { return this.categoryMeta[cat]?.color || '#6b7280'; }
}
