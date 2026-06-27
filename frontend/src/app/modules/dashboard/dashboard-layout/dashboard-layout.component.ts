import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AiMessage { role: 'user' | 'assistant'; content: string; time: Date; }

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements AfterViewChecked {
  @ViewChild('floatMessages') floatMessages!: ElementRef;

  sidebarOpen = true;

  // ── Floating AI Chat ──────────────────────────────────────
  aiChatOpen = false;
  aiMessages: AiMessage[] = [];
  aiInput = '';
  aiLoading = false;
  aiUnread = 0;
  private _prevMsgCount = 0;

  aiSuggestions = [
    'Blood pressure symptoms?',
    'How to do CPR?',
    'Diabetes diet tips',
    'Fever home remedies'
  ];

  constructor(private http: HttpClient) {
    this._applySidebarVar(true);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this._applySidebarVar(this.sidebarOpen);
  }

  /** Sets --sidebar-w CSS custom property on :root.
   *  Custom properties are NOT inline styles, so media queries override them. */
  private _applySidebarVar(open: boolean): void {
    document.documentElement.style.setProperty('--sidebar-w', open ? '260px' : '64px');
  }

  ngAfterViewChecked(): void {
    try {
      if (this.floatMessages && this.aiMessages.length !== this._prevMsgCount) {
        this._prevMsgCount = this.aiMessages.length;
        const el = this.floatMessages.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }

  toggleAiChat(): void {
    this.aiChatOpen = !this.aiChatOpen;
    if (this.aiChatOpen) this.aiUnread = 0;
  }

  sendAiMessage(text?: string): void {
    const message = (text || this.aiInput).trim();
    if (!message || this.aiLoading) return;
    this.aiInput = '';
    this.aiMessages.push({ role: 'user', content: message, time: new Date() });
    this.aiLoading = true;

    const history = this.aiMessages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    this.http.post<any>(`${environment.apiUrl}/ai/chat`, { message, history }).subscribe({
      next: res => {
        this.aiMessages.push({ role: 'assistant', content: res.data.reply, time: new Date() });
        this.aiLoading = false;
        if (!this.aiChatOpen) this.aiUnread++;
      },
      error: () => {
        this.aiMessages.push({ role: 'assistant', content: 'Sorry, I could not process your request. Please try again.', time: new Date() });
        this.aiLoading = false;
      }
    });
  }
}
