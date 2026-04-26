import { Injectable, signal } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

export interface RenderOptions {
  pageNumber: number;
  scale: number;
  canvas: HTMLCanvasElement;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private pdfDocument: PDFDocumentProxy | null = null;

  readonly currentPage = signal(1);
  readonly totalPages = signal(0);
  readonly scale = signal(1.5);
  readonly isLoaded = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async loadDocument(file: File): Promise<void> {
    this.errorMessage.set(null);
    this.isLoaded.set(false);
    this.currentPage.set(1);
    this.totalPages.set(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      this.pdfDocument = pdf;
      this.totalPages.set(pdf.numPages);
      this.isLoaded.set(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load PDF';
      this.errorMessage.set(message);
      this.pdfDocument = null;
    }
  }

  async renderPage(options: RenderOptions): Promise<void> {
    if (!this.pdfDocument) {
      return;
    }

    const page = await this.pdfDocument.getPage(options.pageNumber);
    const viewport = page.getViewport({ scale: options.scale });

    const canvas = options.canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    page.cleanup();
  }

  goToPage(pageNumber: number): void {
    if (!this.pdfDocument) {
      return;
    }
    const clamped = Math.max(1, Math.min(pageNumber, this.pdfDocument.numPages));
    this.currentPage.set(clamped);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  zoomIn(): void {
    this.scale.update((s) => Math.min(s + 0.25, 4));
  }

  zoomOut(): void {
    this.scale.update((s) => Math.max(s - 0.25, 0.25));
  }
}
