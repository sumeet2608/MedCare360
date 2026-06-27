import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AiCommandCenterComponent } from './ai-command-center.component';

const routes: Routes = [{ path: '', component: AiCommandCenterComponent }];

@NgModule({
  declarations: [AiCommandCenterComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AiCommandCenterModule {}
