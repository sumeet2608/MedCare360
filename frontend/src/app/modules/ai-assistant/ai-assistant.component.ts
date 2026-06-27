import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

@Component({ selector: 'app-ai-assistant', templateUrl: './ai-assistant.component.html', styleUrls: ['./ai-assistant.component.scss'] })
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('messageList') messageList!: ElementRef;

  messages: Message[] = [];
  inputMessage = '';
  loading = false;
  showWelcome = true;

  suggestedQuestions = [
    'What are the symptoms of high blood pressure?',
    'How to do CPR correctly?',
    'What should I eat to control diabetes?',
    'What are common cold vs flu symptoms?',
    'How to handle a fever at home?',
    'What is preventive healthcare?'
  ];

  constructor(private http: HttpClient) {}

  ngAfterViewChecked(): void { this.scrollToBottom(); }

  scrollToBottom(): void {
    try { if (this.messageList) this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight; } catch {}
  }

  sendMessage(text?: string): void {
    const message = (text || this.inputMessage).trim();
    if (!message || this.loading) return;
    this.showWelcome = false;
    this.inputMessage = '';
    this.messages.push({ role: 'user', content: message, timestamp: new Date() });
    this.loading = true;

    const history = this.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    this.http.post<any>(`${environment.apiUrl}/ai/chat`, { message, history }).subscribe({
      next: res => {
        this.messages.push({ role: 'assistant', content: res.data.reply, timestamp: new Date() });
        this.loading = false;
      },
      error: () => {
        this.messages.push({ role: 'assistant', content: 'I apologize, I could not process your request. Please try again.', timestamp: new Date() });
        this.loading = false;
      }
    });
  }

  onKeyDown(e: KeyboardEvent): void { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); } }

  clearChat(): void { this.messages = []; this.showWelcome = true; }
}
