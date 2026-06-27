import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { EmrDashboardComponent } from './emr-dashboard/emr-dashboard.component';
import { ClinicalTimelineComponent } from './clinical-timeline/clinical-timeline.component';
import { SoapNoteEditorComponent } from './soap-note-editor/soap-note-editor.component';
import { PrescriptionGeneratorComponent } from './prescription-generator/prescription-generator.component';

const routes: Routes = [
  { path: '', component: EmrDashboardComponent },
  { path: 'timeline/:patientId', component: ClinicalTimelineComponent },
  { path: 'soap/new', component: SoapNoteEditorComponent },
  { path: 'soap/:id', component: SoapNoteEditorComponent },
  { path: 'prescription/new', component: PrescriptionGeneratorComponent },
  { path: 'prescription/:id', component: PrescriptionGeneratorComponent }
];

@NgModule({
  declarations: [
    EmrDashboardComponent,
    ClinicalTimelineComponent,
    SoapNoteEditorComponent,
    PrescriptionGeneratorComponent
  ],
  imports: [
    CommonModule, RouterModule.forChild(routes), FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatExpansionModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule, MatDividerModule, MatBadgeModule, MatDialogModule,
    MatAutocompleteModule, MatDatepickerModule, MatNativeDateModule
  ]
})
export class EmrModule {}
