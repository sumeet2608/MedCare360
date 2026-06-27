import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BillingListComponent } from './billing-list/billing-list.component';
import { InvoiceComponent } from './invoice/invoice.component';

const routes: Routes = [
  { path: '', component: BillingListComponent },
  { path: 'new', component: InvoiceComponent },
  { path: ':id', component: InvoiceComponent }
];

@NgModule({
  declarations: [BillingListComponent, InvoiceComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class BillingModule {}
