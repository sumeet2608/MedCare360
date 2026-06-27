import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PharmacyListComponent } from './pharmacy-list/pharmacy-list.component';
import { PharmacyFormComponent } from './pharmacy-form/pharmacy-form.component';
import { MedicineDetailComponent } from './medicine-detail/medicine-detail.component';
import { MedicineCompareComponent } from './medicine-compare/medicine-compare.component';
import { MedicineSearchComponent } from './medicine-search/medicine-search.component';

const routes: Routes = [
  { path: '', component: PharmacyListComponent },
  { path: 'new', component: PharmacyFormComponent },
  { path: 'search', component: MedicineSearchComponent },
  { path: 'compare', component: MedicineCompareComponent },
  { path: ':id/edit', component: PharmacyFormComponent },
  { path: ':id', component: MedicineDetailComponent }
];

@NgModule({
  declarations: [PharmacyListComponent, PharmacyFormComponent, MedicineDetailComponent, MedicineCompareComponent, MedicineSearchComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class PharmacyModule {}
