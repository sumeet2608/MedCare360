import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { createWorker } from 'tesseract.js';

@Component({ selector: 'app-medicine-scanner', templateUrl: './medicine-scanner.component.html', styleUrls: ['./medicine-scanner.component.scss'] })
export class MedicineScannerComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  result: any = null;
  loading = false;
  error = '';

  ocrText = '';
  ocrRunning = false;
  scanStage: 'idle' | 'ocr' | 'ai' = 'idle';

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.error = 'Please select an image file (JPG, PNG, etc.)'; return; }
    if (file.size > 10 * 1024 * 1024) { this.error = 'File size must be under 10MB'; return; }
    this.error = '';
    this.selectedFile = file;
    this.result = null;
    const reader = new FileReader();
    reader.onload = (e) => { this.previewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) { const dt = new DataTransfer(); dt.items.add(file); this.fileInput.nativeElement.files = dt.files; this.onFileSelected({ target: this.fileInput.nativeElement } as any); }
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  // Compress image to max 1024px JPEG to avoid Groq/Tesseract size limits
  private compressImage(dataUrl: string, maxPx = 1024, quality = 0.82): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl); // fallback: use original
      img.src = dataUrl;
    });
  }

  async scanMedicine(): Promise<void> {
    if (!this.previewUrl) return;
    this.loading = true;
    this.error = '';
    this.result = null;
    this.ocrText = '';

    // Compress image first — large images cause Groq 400 and Tesseract worker crashes
    const compressedUrl = await this.compressImage(this.previewUrl);

    // Step 1: OCR hint (Tesseract.js) — non-critical, AI works without it
    this.scanStage = 'ocr';
    this.ocrRunning = true;
    try {
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(compressedUrl);
      this.ocrText = (data.text || '').trim();
      await worker.terminate();
    } catch (_) {
      this.ocrText = ''; // OCR failure is non-blocking — AI still runs
    }
    this.ocrRunning = false;

    // Step 2: send compressed image + OCR hint to backend AI
    this.scanStage = 'ai';
    this.http.post<any>(`${environment.apiUrl}/ai/scan-medicine`, {
      imageBase64: compressedUrl,
      imageName: this.selectedFile?.name,
      ocrText: this.ocrText
    }).subscribe({
      next: res => { this.result = res.data; this.loading = false; this.scanStage = 'idle'; },
      error: (err) => {
        this.loading = false; this.scanStage = 'idle';
        this.error = err.error?.message || 'Scan failed. Try a clearer image with the medicine label fully visible.';
      }
    });
  }

  reset(): void { this.selectedFile = null; this.previewUrl = null; this.result = null; this.error = ''; this.ocrText = ''; this.scanStage = 'idle'; }

  getConfidenceColor(confidence: string): string {
    return { high: '#4caf50', medium: '#ff9800', low: '#f44336' }[confidence] || '#999';
  }
}
