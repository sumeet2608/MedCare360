import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { GlobalSearchService } from '../global-search/global-search.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @Output() menuToggle = new EventEmitter<void>();
  pageTitle = 'Dashboard';

  private readonly routeLabels: Record<string, string> = {
    '/dashboard': 'Dashboard', '/patients': 'Patients', '/doctors': 'Doctors',
    '/appointments': 'Appointments', '/pharmacy': 'Pharmacy', '/lab': 'Laboratory',
    '/billing': 'Billing & Invoices', '/emr': 'Medical Records', '/analytics': 'Analytics',
    '/emergency': 'Emergency', '/ambulance': 'Ambulance', '/blood-bank': 'Blood Bank',
    '/bed-management': 'Bed Management', '/operation-theater': 'Operation Theater',
    '/telemedicine': 'Telemedicine', '/medical-imaging': 'Medical Imaging',
    '/inventory': 'Inventory', '/staff': 'Staff', '/ai-assistant': 'AI Assistant',
    '/ai-command-center': 'AI Command Center', '/medicine-scanner': 'Medicine Scanner'
  };

  constructor(public auth: AuthService, public router: Router, private searchService: GlobalSearchService) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const seg = '/' + (e.urlAfterRedirects?.split('/')[1] || '');
      this.pageTitle = this.routeLabels[seg] || 'MedCare 360';
    });
  }

  openSearch(): void { this.searchService.trigger(); }
  get fullName(): string { const u = this.auth.currentUser; return u ? `${u.firstName} ${u.lastName}` : ''; }
  navigateTo(path: string): void { this.router.navigate([path]); }
  logout(): void { this.auth.logout(); }
}
