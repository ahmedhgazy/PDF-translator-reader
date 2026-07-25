import { Injectable, signal, inject } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextContent } from 'pdfjs-dist/types/src/display/api';
import { PdfStorageService } from './pdf-storage.service';

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
  private readonly storage = inject(PdfStorageService);
  private pdfDocument: PDFDocumentProxy | null = null;
  private currentRenderTask: { cancel(): void } | null = null;

  readonly currentPage = signal(1);
  readonly totalPages = signal(0);
  readonly scale = signal(1.5);
  readonly isLoaded = signal(false);
  readonly isRendering = signal(false);
  readonly currentFileName = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isFitToWidth = signal(false);

  // Stored natural page width (at scale=1) for fit-to-width calculation
  private naturalPageWidth = 0;

  /** Load from a File picked by the user, then persist to IndexedDB. */
  async loadDocument(file: File): Promise<void> {
    this.errorMessage.set(null);
    this.isLoaded.set(false);
    this.currentPage.set(1);
    this.totalPages.set(0);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Persist so the PDF survives a refresh
      await this.storage.savePdf(file, arrayBuffer);

      await this._openArrayBuffer(arrayBuffer, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load PDF';
      this.errorMessage.set(message);
      this.pdfDocument = null;
    }
  }

  /** Called on app startup — restores the last-used PDF from IndexedDB. */
  async tryRestoreLastPdf(): Promise<void> {
    try {
      const stored = await this.storage.loadPdf();
      if (stored) {
        await this._openArrayBuffer(stored.data, stored.name);
      }
    } catch {
      // Silently ignore restore failures
    }
  }

  private async _openArrayBuffer(arrayBuffer: ArrayBuffer, name: string): Promise<void> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    this.pdfDocument = pdf;
    this.totalPages.set(pdf.numPages);
    this.currentFileName.set(name);
    // Store the natural page width at scale=1 for fit-to-width calculations
    const firstPage = await pdf.getPage(1);
    const vp = firstPage.getViewport({ scale: 1 });
    this.naturalPageWidth = vp.width;
    firstPage.cleanup();
    this.isLoaded.set(true);
  }

  async renderPage(options: RenderOptions): Promise<{
    viewport: import('pdfjs-dist').PageViewport;
    textContent: TextContent;
  } | null> {
    if (!this.pdfDocument) {
      return null;
    }

    // Cancel any in-progress render
    if (this.currentRenderTask) {
      try { this.currentRenderTask.cancel(); } catch { /* ignore */ }
      this.currentRenderTask = null;
    }

    this.isRendering.set(true);

    try {
      const page = await this.pdfDocument.getPage(options.pageNumber);
      const viewport = page.getViewport({ scale: options.scale });

      const canvas = options.canvas;
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport
      });

      this.currentRenderTask = renderTask;
      await renderTask.promise;
      this.currentRenderTask = null;

      const textContent = await page.getTextContent();
      page.cleanup();

      return { viewport, textContent };
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('cancel')) {
        return null;
      }
      throw err;
    } finally {
      this.isRendering.set(false);
    }
  }

  async renderTextLayer(
    container: HTMLElement,
    viewport: import('pdfjs-dist').PageViewport,
    textContent: TextContent
  ): Promise<void> {
    container.innerHTML = '';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    container.style.setProperty('--scale-factor', `${viewport.scale}`);

    const textLayer = new TextLayer({
      textContentSource: textContent,
      container,
      viewport
    });

    await textLayer.render();
  }

  goToPage(pageNumber: number): void {
    if (!this.pdfDocument) return;
    const clamped = Math.max(1, Math.min(pageNumber, this.pdfDocument.numPages));
    this.currentPage.set(clamped);
  }

  nextPage(): void { this.goToPage(this.currentPage() + 1); }
  previousPage(): void { this.goToPage(this.currentPage() - 1); }

  setZoomScale(newScale: number): void {
    this.isFitToWidth.set(false);
    const clamped = Math.max(0.25, Math.min(newScale, 10));
    this.scale.set(parseFloat(clamped.toFixed(3)));
  }

  zoomIn(): void {
    this.isFitToWidth.set(false);
    this.scale.update((s) => Math.min(s + 0.25, 10));
  }

  zoomOut(): void {
    this.isFitToWidth.set(false);
    this.scale.update((s) => Math.max(s - 0.25, 0.25));
  }

  resetZoom(): void {
    this.isFitToWidth.set(false);
    this.scale.set(1.5);
  }

  /** Set scale so the page exactly fills `availableWidthPx` pixels. */
  fitToWidth(availableWidthPx: number): void {
    if (!this.naturalPageWidth || availableWidthPx <= 0) return;
    const newScale = Math.max(0.25, Math.min(availableWidthPx / this.naturalPageWidth, 10));
    this.scale.set(parseFloat(newScale.toFixed(3)));
  }

  toggleFitToWidth(): void {
    this.isFitToWidth.update(v => !v);
    if (!this.isFitToWidth()) {
      this.scale.set(1.5); // restore default on exit
    }
  }

  async closePdf(): Promise<void> {
    await this.storage.clearPdf();
    this.pdfDocument = null;
    this.naturalPageWidth = 0;
    this.isLoaded.set(false);
    this.isFitToWidth.set(false);
    this.currentPage.set(1);
    this.totalPages.set(0);
    this.scale.set(1.5);
    this.currentFileName.set(null);
    this.errorMessage.set(null);
  }
}
