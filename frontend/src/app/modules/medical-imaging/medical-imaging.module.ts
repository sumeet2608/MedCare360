import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { MedicalImagingComponent } from './medical-imaging.component';

const routes: Routes = [{ path: '', component: MedicalImagingComponent }];

@NgModule({
  declarations: [MedicalImagingComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class MedicalImagingModule {}
