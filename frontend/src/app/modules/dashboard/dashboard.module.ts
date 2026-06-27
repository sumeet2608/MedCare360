import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { DoctorDashboardComponent } from './doctor-dashboard/doctor-dashboard.component';
import { PatientDashboardComponent } from './patient-dashboard/patient-dashboard.component';
import { NgChartsModule } from 'ng2-charts';

// DashboardLayoutComponent is declared in SharedModule and used as the
// app-level shell route in app-routing.module.ts — not needed here.
const routes: Routes = [
  { path: 'admin',   component: AdminDashboardComponent },
  { path: 'doctor',  component: DoctorDashboardComponent },
  { path: 'patient', component: PatientDashboardComponent },
  { path: '', redirectTo: 'admin', pathMatch: 'full' }
];

@NgModule({
  declarations: [AdminDashboardComponent, DoctorDashboardComponent, PatientDashboardComponent],
  imports: [SharedModule, NgChartsModule, RouterModule.forChild(routes)]
})
export class DashboardModule {}
