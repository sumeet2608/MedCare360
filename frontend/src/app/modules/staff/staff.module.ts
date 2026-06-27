import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { StaffComponent } from './staff.component';

const routes: Routes = [{ path: '', component: StaffComponent }];
@NgModule({ declarations: [StaffComponent], imports: [SharedModule, RouterModule.forChild(routes)] })
export class StaffModule {}
