import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { GlobalSearchService } from './global-search.service';

interface SearchResultItem { id: string; label: string; sub: string; route: any[]; }
interface SearchGroup { key: string; icon: string; label: string; items: SearchResultItem[]; }

interface CommandItem { label: string; icon: string; route: any[]; keywords: string; }

@Component({ selector: 'app-global-search', templateUrl: './global-search.component.html', styleUrls: ['./global-search.component.scss'] })
export class GlobalSearchComponent implements OnInit {
  open = false;
  query = '';
  loading = false;
  groups: SearchGroup[] = [];
  flatResults: (SearchResultItem & { groupLabel: string; groupIcon: string })[] = [];
  activeIndex = 0;
  private debounceTimer: any;

  commands: CommandItem[] = [
    { label: 'Go to Dashboard', icon: 'dashboard', route: ['/dashboard/admin'], keywords: 'dashboard home overview' },
    { label: 'Open AI Assistant', icon: 'smart_toy', route: ['/ai-assistant'], keywords: 'ai chat assistant ask' },
    { label: 'AI Command Center', icon: 'bolt', route: ['/ai-command-center'], keywords: 'ai command center operations hub action' },
    { label: 'Scan a Medicine', icon: 'document_scanner', route: ['/medicine-scanner'], keywords: 'scan medicine ocr camera' },
    { label: 'View Analytics', icon: 'analytics', route: ['/analytics'], keywords: 'analytics charts revenue stats reports' },
    { label: 'Manage Patients', icon: 'people', route: ['/patients'], keywords: 'patients register patient list' },
    { label: 'Manage Doctors', icon: 'medical_services', route: ['/doctors'], keywords: 'doctors specialists' },
    { label: 'Book Appointment', icon: 'calendar_today', route: ['/appointments/new'], keywords: 'appointment book schedule' },
    { label: 'Pharmacy Search', icon: 'medication', route: ['/pharmacy/search'], keywords: 'pharmacy medicine search drugs' },
    { label: 'Compare Medicines', icon: 'compare_arrows', route: ['/pharmacy/compare'], keywords: 'compare medicines drugs' },
    { label: 'Ambulance Dispatch', icon: 'local_shipping', route: ['/ambulance'], keywords: 'ambulance emergency dispatch gps' },
    { label: 'Emergency Guidance', icon: 'emergency', route: ['/emergency'], keywords: 'emergency first aid help' },
    { label: 'Billing & Invoices', icon: 'receipt_long', route: ['/billing'], keywords: 'billing invoice payment' },
    { label: 'Inventory', icon: 'inventory_2', route: ['/inventory'], keywords: 'inventory stock equipment' },
    { label: 'Staff Management', icon: 'badge', route: ['/staff'], keywords: 'staff employees nurses' },
  ];
  filteredCommands: CommandItem[] = [];

  constructor(private http: HttpClient, private router: Router, private searchService: GlobalSearchService) {}

  ngOnInit(): void {
    this.searchService.openRequested.subscribe(() => this.show());
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.toggle();
      return;
    }
    if (!this.open) return;
    if (e.key === 'Escape') { this.close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); this.selectActive(); return; }
  }

  toggle(): void { this.open ? this.close() : this.show(); }
  show(): void { this.open = true; this.query = ''; this.groups = []; this.flatResults = []; this.filteredCommands = this.commands; this.activeIndex = 0; }
  close(): void { this.open = false; }

  get allItems(): (SearchResultItem & { groupLabel: string; groupIcon: string })[] {
    const commandItems = this.filteredCommands.map(c => ({ id: c.label, label: c.label, sub: '', route: c.route, groupLabel: 'Commands', groupIcon: 'bolt' }));
    return [...commandItems, ...this.flatResults];
  }

  // Flat list of {groupLabel, items:[{...,itemIndex}]} so the template can highlight
  // the active row by a stable index instead of re-deriving it from object identity.
  get displayGroups(): { label: string; icon: string; items: (SearchResultItem & { itemIndex: number })[] }[] {
    const out: { label: string; icon: string; items: (SearchResultItem & { itemIndex: number })[] }[] = [];
    if (this.filteredCommands.length) {
      out.push({ label: 'Commands', icon: 'bolt', items: this.filteredCommands.map((c, i) => ({ id: c.label, label: c.label, sub: '', route: c.route, itemIndex: i })) });
    }
    let offset = this.filteredCommands.length;
    for (const g of this.groups) {
      out.push({ label: g.label, icon: g.icon, items: g.items.map((item, i) => ({ ...item, itemIndex: offset + i })) });
      offset += g.items.length;
    }
    return out;
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.activeIndex = 0;
    const term = value.trim().toLowerCase();
    this.filteredCommands = term ? this.commands.filter(c => c.keywords.includes(term) || c.label.toLowerCase().includes(term)) : this.commands;

    clearTimeout(this.debounceTimer);
    if (term.length < 2) { this.groups = []; this.flatResults = []; return; }
    this.debounceTimer = setTimeout(() => this.runSearch(term), 250);
  }

  runSearch(term: string): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/search`, { params: { q: term } }).subscribe({
      next: res => {
        const data = res.data || {};
        const defs: { key: string; icon: string; label: string }[] = [
          { key: 'patients', icon: 'people', label: 'Patients' },
          { key: 'doctors', icon: 'medical_services', label: 'Doctors' },
          { key: 'medicines', icon: 'medication', label: 'Medicines' },
          { key: 'appointments', icon: 'calendar_today', label: 'Appointments' },
          { key: 'inventory', icon: 'inventory_2', label: 'Inventory' },
          { key: 'labTests', icon: 'biotech', label: 'Lab Reports' },
          { key: 'ambulances', icon: 'local_shipping', label: 'Ambulances' },
          { key: 'staff', icon: 'badge', label: 'Staff' },
        ];
        this.groups = defs.map(d => ({ ...d, items: data[d.key] || [] })).filter(g => g.items.length);
        this.flatResults = this.groups.flatMap(g => g.items.map(i => ({ ...i, groupLabel: g.label, groupIcon: g.icon })));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  move(delta: number): void {
    const max = this.allItems.length - 1;
    if (max < 0) return;
    this.activeIndex = Math.min(max, Math.max(0, this.activeIndex + delta));
  }

  selectActive(): void {
    const item = this.allItems[this.activeIndex];
    if (item) this.goTo(item.route);
  }

  goTo(route: any[]): void {
    this.close();
    this.router.navigate(route);
  }
}
