import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { EmergencyComponent } from './emergency.component';
import { EmergencyDetailComponent } from './emergency-detail/emergency-detail.component';

const routes: Routes = [
  { path: '', component: EmergencyComponent },
  { path: ':type', component: EmergencyDetailComponent }
];

@NgModule({
  declarations: [EmergencyComponent, EmergencyDetailComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class EmergencyModule {}
