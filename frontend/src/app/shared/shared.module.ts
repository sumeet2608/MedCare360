import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { DashboardLayoutComponent } from '../modules/dashboard/dashboard-layout/dashboard-layout.component';
import { DataGridComponent } from './components/data-grid/data-grid.component';
import { GridCellDirective } from './components/data-grid/grid-cell.directive';
import { GlobalSearchComponent } from './components/global-search/global-search.component';
import { NotificationBellComponent } from './components/notifications/notification-bell.component';
import { SkeletonLoaderComponent } from './components/skeleton-loader/skeleton-loader.component';

const MATERIAL_MODULES = [
  MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule,
  MatMenuModule, MatDividerModule, MatTooltipModule, MatCardModule,
  MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
  MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule,
  MatChipsModule, MatBadgeModule, MatProgressSpinnerModule, MatDialogModule,
  MatSnackBarModule, MatTabsModule, MatStepperModule, MatCheckboxModule,
  MatRadioModule, MatSlideToggleModule, MatExpansionModule, MatListModule,
  MatGridListModule, MatAutocompleteModule, ScrollingModule
];

@NgModule({
  declarations: [SidebarComponent, NavbarComponent, DashboardLayoutComponent, DataGridComponent, GridCellDirective, GlobalSearchComponent, NotificationBellComponent, SkeletonLoaderComponent],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, HttpClientModule, ...MATERIAL_MODULES],
  exports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    SidebarComponent, NavbarComponent, DashboardLayoutComponent,
    DataGridComponent, GridCellDirective, GlobalSearchComponent, NotificationBellComponent,
    SkeletonLoaderComponent,
    ...MATERIAL_MODULES
  ]
})
export class SharedModule {}
