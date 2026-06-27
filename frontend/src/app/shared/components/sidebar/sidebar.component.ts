import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
  badge?: number;
  dividerBefore?: string; // section heading label
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  navItems: NavItem[] = [
    // ── Core
    { label: 'Dashboard',        icon: 'dashboard',          route: '/dashboard/admin',   roles: ['super_admin', 'hospital_admin', 'nurse', 'receptionist'], dividerBefore: 'Core' },
    { label: 'Dashboard',        icon: 'dashboard',          route: '/dashboard/doctor',  roles: ['doctor'] },
    { label: 'Dashboard',        icon: 'dashboard',          route: '/dashboard/patient', roles: ['patient'] },
    { label: 'Patients',         icon: 'people',             route: '/patients',          roles: ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist'] },
    { label: 'Doctors',          icon: 'medical_services',   route: '/doctors',           roles: ['super_admin', 'hospital_admin', 'receptionist', 'patient'] },
    { label: 'Appointments',     icon: 'calendar_today',     route: '/appointments' },
    // ── Clinical
    { label: 'EMR',              icon: 'folder_shared',      route: '/emr',               roles: ['super_admin', 'hospital_admin', 'doctor', 'nurse'], dividerBefore: 'Clinical' },
    { label: 'Pharmacy',         icon: 'local_pharmacy',     route: '/pharmacy',          roles: ['super_admin', 'hospital_admin', 'pharmacist', 'doctor'] },
    { label: 'Lab',              icon: 'science',            route: '/lab',               roles: ['super_admin', 'hospital_admin', 'doctor', 'lab_technician'] },
    { label: 'Medical Imaging',  icon: 'biotech',            route: '/medical-imaging',   roles: ['super_admin', 'hospital_admin', 'doctor', 'lab_technician'] },
    { label: 'Blood Bank',       icon: 'bloodtype',          route: '/blood-bank',        roles: ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'lab_technician'] },
    { label: 'Operation Theater',icon: 'hardware',           route: '/operation-theater', roles: ['super_admin', 'hospital_admin', 'doctor', 'nurse'] },
    { label: 'Telemedicine',     icon: 'video_call',         route: '/telemedicine',      roles: ['super_admin', 'hospital_admin', 'doctor', 'patient'] },
    // ── Emergency & Ops
    { label: 'Emergency',        icon: 'emergency',          route: '/emergency',                                                                              dividerBefore: 'Emergency' },
    { label: 'Ambulance',        icon: 'local_shipping',     route: '/ambulance',         roles: ['super_admin', 'hospital_admin', 'receptionist', 'ambulance_staff'] },
    { label: 'Bed Management',   icon: 'bed',                route: '/bed-management',    roles: ['super_admin', 'hospital_admin', 'nurse', 'receptionist'] },
    // ── Admin
    { label: 'Billing',          icon: 'receipt_long',       route: '/billing',           roles: ['super_admin', 'hospital_admin', 'receptionist', 'patient'], dividerBefore: 'Admin' },
    { label: 'Inventory',        icon: 'inventory_2',        route: '/inventory',         roles: ['super_admin', 'hospital_admin'] },
    { label: 'Staff',            icon: 'badge',              route: '/staff',             roles: ['super_admin', 'hospital_admin'] },
    { label: 'Analytics',        icon: 'analytics',          route: '/analytics',         roles: ['super_admin', 'hospital_admin', 'doctor'] },
    // ── AI & Tools
    { label: 'AI Assistant',     icon: 'smart_toy',          route: '/ai-assistant',                                                                           dividerBefore: 'AI & Tools' },
    { label: 'AI Command Center', icon: 'bolt',              route: '/ai-command-center', roles: ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'] },
    { label: 'Medicine Scanner', icon: 'document_scanner',   route: '/medicine-scanner' }
  ];

  constructor(public auth: AuthService, private router: Router) {}

  get visibleItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.roles || item.roles.length === 0) return true;
      return item.roles.includes(this.auth.userRole);
    });
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.auth.logout();
  }
}
