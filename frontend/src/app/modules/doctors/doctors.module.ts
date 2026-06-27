import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DoctorListComponent } from './doctor-list/doctor-list.component';
import { DoctorFormComponent } from './doctor-form/doctor-form.component';
import { DoctorDetailComponent } from './doctor-detail/doctor-detail.component';

const routes: Routes = [
  { path: '', component: DoctorListComponent },
  { path: 'new', component: DoctorFormComponent },
  { path: ':id/edit', component: DoctorFormComponent },
  { path: ':id', component: DoctorDetailComponent }
];

@NgModule({
  declarations: [DoctorListComponent, DoctorFormComponent, DoctorDetailComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class DoctorsModule {}
