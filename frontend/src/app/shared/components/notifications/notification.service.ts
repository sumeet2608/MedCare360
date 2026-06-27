import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private socket: Socket | null = null;
  notifications$ = new BehaviorSubject<AppNotification[]>([]);
  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient, private auth: AuthService) {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.load();
        this.connectSocket(user.id);
      } else {
        this.disconnectSocket();
        this.notifications$.next([]);
        this.unreadCount$.next(0);
      }
    });
  }

  private connectSocket(userId: string): void {
    if (this.socket) return;
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    this.socket = io(base, { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => this.socket?.emit('authenticate', userId));
    this.socket.on('notification', (notif: AppNotification) => {
      this.notifications$.next([notif, ...this.notifications$.value].slice(0, 50));
      this.unreadCount$.next(this.unreadCount$.value + 1);
    });
  }

  private disconnectSocket(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  load(): void {
    this.http.get<any>(`${environment.apiUrl}/notifications`).subscribe({
      next: res => { this.notifications$.next(res.data || []); this.unreadCount$.next(res.unreadCount || 0); },
      error: () => {}
    });
  }

  markAsRead(id: string): void {
    this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        const updated = this.notifications$.value.map(n => n._id === id ? { ...n, isRead: true } : n);
        this.notifications$.next(updated);
        this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1));
      }
    });
  }

  markAllAsRead(): void {
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications$.next(this.notifications$.value.map(n => ({ ...n, isRead: true })));
        this.unreadCount$.next(0);
      }
    });
  }
}
