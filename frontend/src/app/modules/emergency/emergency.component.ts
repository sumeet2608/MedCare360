import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({ selector: 'app-emergency', templateUrl: './emergency.component.html', styleUrls: ['./emergency.component.scss'] })
export class EmergencyComponent {
  // Magic MCP: dark gradient cards per emergency type (21st.dev Statistics Card 2 pattern)
  emergencies = [
    { type: 'heart_attack',       label: 'Heart Attack',       icon: 'favorite',              color: '#c62828', bg: '#ffebee', desc: 'Chest pain, arm/jaw pain, shortness of breath',    darkGradient: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
    { type: 'stroke',             label: 'Stroke',             icon: 'psychology',             color: '#6a1b9a', bg: '#f3e5f5', desc: 'Face drooping, arm weakness, speech difficulty',   darkGradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
    { type: 'burns',              label: 'Burns',              icon: 'local_fire_department',  color: '#e65100', bg: '#fff3e0', desc: 'Thermal, chemical or electrical burns',              darkGradient: 'linear-gradient(135deg,#7c2d12,#ea580c)' },
    { type: 'choking',            label: 'Choking',            icon: 'air',                    color: '#00695c', bg: '#e0f2f1', desc: 'Airway blockage, inability to breathe or speak',   darkGradient: 'linear-gradient(135deg,#064e3b,#059669)' },
    { type: 'seizure',            label: 'Seizure',            icon: 'electric_bolt',          color: '#1565c0', bg: '#e3f2fd', desc: 'Uncontrolled shaking, loss of consciousness',       darkGradient: 'linear-gradient(135deg,#1e3a8a,#2563eb)' },
    { type: 'bleeding',           label: 'Severe Bleeding',   icon: 'bloodtype',              color: '#b71c1c', bg: '#ffebee', desc: 'Uncontrolled or heavy bleeding from wounds',         darkGradient: 'linear-gradient(135deg,#450a0a,#b91c1c)' },
    { type: 'asthma',             label: 'Asthma Attack',     icon: 'air',                    color: '#01579b', bg: '#e1f5fe', desc: 'Severe breathing difficulty, wheezing',              darkGradient: 'linear-gradient(135deg,#0c4a6e,#0284c7)' },
    { type: 'diabetic_emergency', label: 'Diabetic Emergency',icon: 'glucose',                color: '#2e7d32', bg: '#e8f5e9', desc: 'Low blood sugar — shaking, sweating, confusion',    darkGradient: 'linear-gradient(135deg,#14532d,#16a34a)' }
  ];

  constructor(private router: Router) {}

  navigate(type: string): void { this.router.navigate(['/emergency', type]); }
}
