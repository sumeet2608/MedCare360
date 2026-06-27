import { Component } from '@angular/core';
// Passthrough — sidebar/navbar/page-content are already provided by DashboardLayoutComponent.
// Do NOT add another shell here; it would double the margin-left offset.
@Component({ selector: 'app-patients-layout', template: `<router-outlet></router-outlet>` })
export class PatientsLayoutComponent {}
