import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { MedicineScannerComponent } from './medicine-scanner.component';

const routes: Routes = [{ path: '', component: MedicineScannerComponent }];

@NgModule({
  declarations: [MedicineScannerComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class MedicineScannerModule {}
