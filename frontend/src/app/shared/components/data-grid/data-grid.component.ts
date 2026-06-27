import { Component, ContentChildren, EventEmitter, Input, OnChanges, Output, QueryList, SimpleChanges } from '@angular/core';
import { GridCellDirective } from './grid-cell.directive';

export interface GridColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'currency' | 'number' | 'badge';
  hideByDefault?: boolean;
  width?: string;
}

@Component({ selector: 'app-data-grid', templateUrl: './data-grid.component.html', styleUrls: ['./data-grid.component.scss'] })
export class DataGridComponent implements OnChanges {
  @Input() columns: GridColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() searchPlaceholder = 'Search...';
  @Input() pageSizeOptions = [10, 20, 50];
  @Input() virtualScroll = false;
  @Input() virtualItemSize = 52;
  @Input() selectable = false;
  @Input() exportFilename = 'export';
  @Input() emptyMessage = 'No records found';

  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  @ContentChildren(GridCellDirective) cellTemplates!: QueryList<GridCellDirective>;
  templateMap: Record<string, GridCellDirective> = {};

  searchTerm = '';
  sortKey: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  visibleKeys = new Set<string>();
  pageIndex = 0;
  pageSize = 20;
  selected = new Set<any>();
  showColumnMenu = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.visibleKeys = new Set(this.columns.filter(c => !c.hideByDefault).map(c => c.key));
      this.pageSize = this.pageSizeOptions[0] || 20;
    }
  }

  ngAfterContentInit(): void {
    this.cellTemplates.forEach(t => this.templateMap[t.columnKey] = t);
  }

  get visibleColumns(): GridColumn[] {
    return this.columns.filter(c => this.visibleKeys.has(c.key));
  }

  getValue(row: any, key: string): any {
    return key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), row);
  }

  formatValue(row: any, col: GridColumn): string {
    const v = this.getValue(row, col.key);
    if (v == null || v === '') return '—';
    switch (col.type) {
      case 'date': return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      case 'currency': return `₹${v}`;
      case 'number': return String(v);
      default: return String(v);
    }
  }

  get filteredRows(): any[] {
    let list = [...this.rows];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      list = list.filter(row => this.columns.some(c => String(this.getValue(row, c.key) ?? '').toLowerCase().includes(term)));
    }
    if (this.sortKey) {
      const key = this.sortKey;
      list.sort((a, b) => {
        const av = this.getValue(a, key);
        const bv = this.getValue(b, key);
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }

  get pagedRows(): any[] {
    const filtered = this.filteredRows;
    if (this.virtualScroll) return filtered;
    const start = this.pageIndex * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  onSearch(value: string): void { this.searchTerm = value; this.pageIndex = 0; }

  toggleSort(col: GridColumn): void {
    if (!col.sortable) return;
    if (this.sortKey === col.key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = col.key;
      this.sortDir = 'asc';
    }
  }

  toggleColumn(key: string): void {
    if (this.visibleKeys.has(key)) this.visibleKeys.delete(key);
    else this.visibleKeys.add(key);
  }

  prevPage(): void { if (this.pageIndex > 0) this.pageIndex--; }
  nextPage(): void { if (this.pageIndex < this.totalPages - 1) this.pageIndex++; }

  isSelected(row: any): boolean { return this.selected.has(row); }
  toggleRow(row: any, event: Event): void {
    event.stopPropagation();
    if (this.selected.has(row)) this.selected.delete(row);
    else this.selected.add(row);
    this.selectionChange.emit(Array.from(this.selected));
  }
  get allPagedSelected(): boolean {
    const page = this.pagedRows;
    return page.length > 0 && page.every(r => this.selected.has(r));
  }
  toggleSelectAllPaged(): void {
    const page = this.pagedRows;
    if (this.allPagedSelected) page.forEach(r => this.selected.delete(r));
    else page.forEach(r => this.selected.add(r));
    this.selectionChange.emit(Array.from(this.selected));
  }

  exportCsv(): void {
    const cols = this.visibleColumns;
    const header = cols.map(c => `"${c.label}"`).join(',');
    const lines = this.filteredRows.map(row =>
      cols.map(c => `"${String(this.formatValue(row, c)).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
