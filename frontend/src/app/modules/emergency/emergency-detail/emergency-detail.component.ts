import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-emergency-detail', templateUrl: './emergency-detail.component.html', styleUrls: ['./emergency-detail.component.scss'] })
export class EmergencyDetailComponent implements OnInit {
  guidance: any = null;
  loading = true;
  type = '';

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.type = this.route.snapshot.paramMap.get('type') || '';
    this.http.get<any>(`${environment.apiUrl}/ai/emergency/${this.type}`).subscribe({
      next: res => { this.guidance = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
