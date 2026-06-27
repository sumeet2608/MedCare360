import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AiAssistantComponent } from './ai-assistant.component';

const routes: Routes = [{ path: '', component: AiAssistantComponent }];

@NgModule({
  declarations: [AiAssistantComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AiAssistantModule {}
