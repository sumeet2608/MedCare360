import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  openRequested = new Subject<void>();
  trigger(): void { this.openRequested.next(); }
}
