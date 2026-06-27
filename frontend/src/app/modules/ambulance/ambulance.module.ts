import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AmbulanceComponent } from './ambulance.component';
import { AmbulanceMapComponent } from './ambulance-map/ambulance-map.component';

const routes: Routes = [{ path: '', component: AmbulanceComponent }];
@NgModule({ declarations: [AmbulanceComponent, AmbulanceMapComponent], imports: [SharedModule, RouterModule.forChild(routes)] })
export class AmbulanceModule {}
