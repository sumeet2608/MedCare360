import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TelemedicineComponent } from './telemedicine.component';

const routes: Routes = [{ path: '', component: TelemedicineComponent }];

@NgModule({
  declarations: [TelemedicineComponent],
  imports: [
    CommonModule, RouterModule.forChild(routes), ReactiveFormsModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatDividerModule
  ]
})
export class TelemedicineModule {}
