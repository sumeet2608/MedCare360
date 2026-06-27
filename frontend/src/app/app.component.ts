import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `
    <a class="skip-link" href="#main-content" aria-label="Skip to main content">Skip to main content</a>
    <router-outlet></router-outlet>
    <app-global-search></app-global-search>
  `,
  standalone: false
})
export class AppComponent {
  title = 'MedCare 360';
}
