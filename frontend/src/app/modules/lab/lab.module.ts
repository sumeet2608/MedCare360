import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LabComponent } from './lab.component';
import { AiLabAnalyzerComponent } from './ai-lab-analyzer/ai-lab-analyzer.component';

const routes: Routes = [{ path: '', component: LabComponent }];
@NgModule({
  declarations: [LabComponent, AiLabAnalyzerComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class LabModule {}
