import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  template: `
    <div class="skeleton-wrap" [style.gap.px]="gap">
      <div *ngFor="let r of rows"
           class="skeleton-row"
           [style.height.px]="height"
           [style.border-radius.px]="radius"
           [style.width]="r">
      </div>
    </div>`,
  styles: [`
    .skeleton-wrap { display: flex; flex-direction: column; }
    .skeleton-row {
      background: linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      flex-shrink: 0;
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() lines: (string | number)[] = ['100%', '80%', '60%'];
  @Input() height = 16;
  @Input() radius = 6;
  @Input() gap = 10;

  get rows(): string[] {
    return this.lines.map(l => typeof l === 'number' ? `${l}%` : l);
  }
}
