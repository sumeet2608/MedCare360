import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { EChartsOption } from 'echarts';

const PALETTE = ['#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0e7490', '#6d28d9', '#047857'];

@Component({ selector: 'app-analytics', templateUrl: './analytics.component.html', styleUrls: ['./analytics.component.scss'] })
export class AnalyticsComponent implements OnInit {
  stats: any = {};
  loading = true;
  revenuePeriod = 'monthly';

  revenueOption: EChartsOption = {};
  genderOption: EChartsOption = {};
  ageOption: EChartsOption = {};
  appointmentTrendOption: EChartsOption = {};
  bedOccupancyOption: EChartsOption = {};
  medicineStockOption: EChartsOption = {};
  inventoryOption: EChartsOption = {};
  ambulanceOption: EChartsOption = {};
  departmentOption: EChartsOption = {};

  bedOccupancyRate = 0;
  lowStockTop: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadAll(); }

  private base(): Partial<EChartsOption> {
    return { textStyle: { fontFamily: 'Noto Sans, sans-serif' }, color: PALETTE, animationDuration: 600 };
  }

  loadAll(): void {
    this.loading = true;
    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/analytics/dashboard`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/revenue?period=${this.revenuePeriod}`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/patients/demographics`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/appointments`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/beds/occupancy`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/medicines/stock`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/inventory/trends`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/ambulances`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/analytics/departments/performance`).toPromise()
    ]).then(([dash, rev, demo, apts, beds, meds, inv, amb, dept]) => {
      this.stats = dash?.data || {};
      this.buildRevenueChart(rev?.data || []);
      this.buildDemographicsCharts(demo?.data || {});
      this.buildAppointmentChart(apts?.data || {});
      this.buildBedChart(beds?.data || {});
      this.buildMedicineChart(meds?.data || {});
      this.buildInventoryChart(inv?.data || {});
      this.buildAmbulanceChart(amb?.data || {});
      this.buildDepartmentChart(dept?.data || []);
      this.loading = false;
    }).catch(() => { this.loading = false; });
  }

  buildRevenueChart(data: any[]): void {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    this.revenueOption = {
      ...this.base(),
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: data.map(d => months[d._id - 1] || `P${d._id}`) },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar', data: data.map(d => d.total), barWidth: '50%',
        itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#0891b2' }, { offset: 1, color: '#0e7490' }] } }
      }]
    };
  }

  buildDemographicsCharts(data: any): void {
    if (data.genderDist) {
      this.genderOption = {
        ...this.base(),
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{ type: 'pie', radius: ['40%', '70%'], data: data.genderDist.map((g: any) => ({ name: g._id, value: g.count })), itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 } }]
      };
    }
    if (data.ageGroups) {
      const labels = ['0-17','18-29','30-44','45-59','60-74','75+'];
      this.ageOption = {
        ...this.base(),
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: data.ageGroups.map((a: any) => a.count), barWidth: '55%', itemStyle: { borderRadius: [6, 6, 0, 0], color: '#7c3aed' } }]
      };
    }
  }

  buildAppointmentChart(data: any): void {
    if (data.dailyTrend) {
      this.appointmentTrendOption = {
        ...this.base(),
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 20, top: 20, bottom: 50 },
        xAxis: { type: 'category', data: data.dailyTrend.map((d: any) => d._id), axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: data.dailyTrend.map((d: any) => d.count), smooth: true, areaStyle: { color: 'rgba(8,145,178,0.12)' }, lineStyle: { color: '#059669', width: 3 }, itemStyle: { color: '#059669' } }]
      };
    }
  }

  buildBedChart(data: any): void {
    this.bedOccupancyRate = data.occupancyRate || 0;
    const statusOrder = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'];
    const colors: any = { available: '#059669', occupied: '#dc2626', reserved: '#d97706', cleaning: '#0891b2', maintenance: '#6d28d9' };
    const sorted = [...(data.statusBreakdown || [])].sort((a, b) => statusOrder.indexOf(a._id) - statusOrder.indexOf(b._id));
    this.bedOccupancyOption = {
      ...this.base(),
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['45%', '75%'],
        data: sorted.map(s => ({ name: s._id, value: s.count, itemStyle: { color: colors[s._id] || '#999' } })),
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n{c}' }
      }]
    };
  }

  buildMedicineChart(data: any): void {
    this.lowStockTop = data.lowStockTop || [];
    const byCategory = data.byCategory || [];
    this.medicineStockOption = {
      ...this.base(),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 110, right: 30, top: 20, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: byCategory.map((c: any) => c._id), axisLabel: { fontSize: 10 } },
      series: [{ type: 'bar', data: byCategory.map((c: any) => c.totalQuantity), barWidth: '60%', itemStyle: { borderRadius: [0, 6, 6, 0], color: '#0891b2' } }]
    };
  }

  buildInventoryChart(data: any): void {
    const byCategory = data.byCategory || [];
    this.inventoryOption = {
      ...this.base(),
      tooltip: { trigger: 'item', formatter: '{b}: {c} items ({d}%)' },
      legend: { bottom: 0, type: 'scroll' },
      series: [{ type: 'pie', radius: '65%', data: byCategory.map((c: any) => ({ name: c._id, value: c.count })), itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 } }]
    };
  }

  buildAmbulanceChart(data: any): void {
    const byStatus = data.byStatus || [];
    const colors: any = { available: '#059669', dispatched: '#dc2626', maintenance: '#d97706', offline: '#64748b' };
    this.ambulanceOption = {
      ...this.base(),
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        data: byStatus.map((s: any) => ({ name: s._id, value: s.count, itemStyle: { color: colors[s._id] || '#999' } })),
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
      }]
    };
  }

  buildDepartmentChart(data: any[]): void {
    this.departmentOption = {
      ...this.base(),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 130, right: 30, top: 20, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: data.map(d => d._id), axisLabel: { fontSize: 10 } },
      series: [{ type: 'bar', data: data.map(d => d.totalAppointments), barWidth: '60%', itemStyle: { borderRadius: [0, 6, 6, 0], color: '#7c3aed' } }]
    };
  }

  onPeriodChange(): void { this.loadAll(); }
}
