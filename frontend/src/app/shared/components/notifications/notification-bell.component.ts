import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from './notification.service';

@Component({ selector: 'app-notification-bell', templateUrl: './notification-bell.component.html', styleUrls: ['./notification-bell.component.scss'] })
export class NotificationBellComponent {
  open = false;

  typeIcons: Record<string, string> = {
    appointment: 'calendar_today',
    emergency: 'emergency',
    ambulance: 'local_shipping',
    medicine: 'medication',
    inventory: 'inventory_2',
    billing: 'receipt_long',
    lab: 'biotech',
    system: 'info'
  };

  constructor(public notificationService: NotificationService, private router: Router) {}

  toggle(): void { this.open = !this.open; }
  close(): void { this.open = false; }

  timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  select(n: AppNotification): void {
    if (!n.isRead) this.notificationService.markAsRead(n._id);
    this.close();
  }

  markAllRead(): void { this.notificationService.markAllAsRead(); }
}
