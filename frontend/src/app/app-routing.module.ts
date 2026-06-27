import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardLayoutComponent } from './modules/dashboard/dashboard-layout/dashboard-layout.component';

const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Public: auth pages (no sidebar/navbar)
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },

  // Shell: ALL authenticated routes rendered inside DashboardLayoutComponent
  // (sidebar + navbar + AI chat FAB persist across navigation)
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'patients',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/patients/patients.module').then(m => m.PatientsModule)
      },
      {
        path: 'doctors',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/doctors/doctors.module').then(m => m.DoctorsModule)
      },
      {
        path: 'appointments',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/appointments/appointments.module').then(m => m.AppointmentsModule)
      },
      {
        path: 'pharmacy',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/pharmacy/pharmacy.module').then(m => m.PharmacyModule)
      },
      {
        path: 'billing',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/billing/billing.module').then(m => m.BillingModule)
      },
      {
        path: 'emergency',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/emergency/emergency.module').then(m => m.EmergencyModule)
      },
      {
        path: 'ambulance',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/ambulance/ambulance.module').then(m => m.AmbulanceModule)
      },
      {
        path: 'lab',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/lab/lab.module').then(m => m.LabModule)
      },
      {
        path: 'inventory',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/inventory/inventory.module').then(m => m.InventoryModule)
      },
      {
        path: 'staff',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/staff/staff.module').then(m => m.StaffModule)
      },
      {
        path: 'ai-assistant',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/ai-assistant/ai-assistant.module').then(m => m.AiAssistantModule)
      },
      {
        path: 'medicine-scanner',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/medicine-scanner/medicine-scanner.module').then(m => m.MedicineScannerModule)
      },
      {
        path: 'analytics',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/analytics/analytics.module').then(m => m.AnalyticsModule)
      },
      {
        path: 'blood-bank',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/blood-bank/blood-bank.module').then(m => m.BloodBankModule)
      },
      {
        path: 'bed-management',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/bed-management/bed-management.module').then(m => m.BedManagementModule)
      },
      {
        path: 'operation-theater',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/operation-theater/operation-theater.module').then(m => m.OperationTheaterModule)
      },
      {
        path: 'telemedicine',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/telemedicine/telemedicine.module').then(m => m.TelemedicineModule)
      },
      {
        path: 'medical-imaging',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/medical-imaging/medical-imaging.module').then(m => m.MedicalImagingModule)
      },
      {
        path: 'ai-command-center',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/ai-command-center/ai-command-center.module').then(m => m.AiCommandCenterModule)
      },
      {
        path: 'emr',
        canActivate: [AuthGuard],
        loadChildren: () => import('./modules/emr/emr.module').then(m => m.EmrModule)
      }
    ]
  },

  { path: '**', redirectTo: '/auth/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
