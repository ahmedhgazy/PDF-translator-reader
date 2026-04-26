import {
  Component,
  ChangeDetectionStrategy,
  viewChild,
  ElementRef,
  effect,
  inject,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core';
import { PdfService } from '../../services/pdf.service';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent implements OnInit, OnDestroy {
  protected readonly pdfService = inject(PdfService);
  private readonly selectionService = inject(SelectionService);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');
  readonly textLayerRef = viewChild<ElementRef<HTMLDivElement>>('textLayer');
  readonly wrapperRef = viewChild<ElementRef<HTMLDivElement>>('canvasWrapper');

  readonly isDragging = signal(false);
  readonly zoomPercent = signal(150);

  private readonly onDocumentMouseUp = () => this.captureSelection();
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const page = this.pdfService.currentPage();
      const scale = this.pdfService.scale();
      const loaded = this.pdfService.isLoaded();
      const canvasEl = this.canvasRef();
      const textLayerEl = this.textLayerRef();

      this.zoomPercent.set(Math.round(scale * 100));

      if (!loaded || !canvasEl || !textLayerEl) {
        return;
      }

      const canvas = canvasEl.nativeElement;
      const textLayer = textLayerEl.nativeElement;

      this.pdfService.renderPage({ pageNumber: page, scale, canvas }).then((result) => {
        if (result) {
          this.pdfService.renderTextLayer(textLayer, result.viewport, result.textContent);
        }
      });
    });
  }

  ngOnInit(): void {
    this.pdfService.tryRestoreLastPdf();
    document.addEventListener('mouseup', this.onDocumentMouseUp);

    // Watch container resize to support fit-to-width
    this.resizeObserver = new ResizeObserver(() => {
      if (this.pdfService.isFitToWidth()) {
        this.applyFitToWidth();
      }
    });

    // Observe after a tick so wrapperRef is available
    setTimeout(() => {
      const wrapper = this.wrapperRef();
      if (wrapper) {
        this.resizeObserver?.observe(wrapper.nativeElement);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
    this.resizeObserver?.disconnect();
  }

  private captureSelection(): void {
    if (!this.pdfService.isLoaded()) return;
    setTimeout(() => {
      const selection = window.getSelection();
      const wrapper = this.wrapperRef()?.nativeElement;
      
      // Only proceed if the selection occurred INSIDE the PDF viewer area
      if (!selection || selection.rangeCount === 0 || !wrapper || !wrapper.contains(selection.anchorNode)) {
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        const domRect = selection.getRangeAt(0).getBoundingClientRect();
        this.selectionService.setSelectedText(text, {
          top: domRect.top,
          bottom: domRect.bottom,
          left: domRect.left,
          right: domRect.right,
          width: domRect.width,
          height: domRect.height
        });
      }
    }, 50);
  }

  /** Calculate and apply scale so the PDF fills the wrapper width. */
  applyFitToWidth(): void {
    const wrapper = this.wrapperRef();
    if (!wrapper) return;
    // Get usable width (subtract padding)
    const available = wrapper.nativeElement.clientWidth - 32; // 16px padding each side
    if (available <= 0) return;
    this.pdfService.fitToWidth(available);
  }

  onFitToWidthClick(): void {
    this.pdfService.toggleFitToWidth();
    if (this.pdfService.isFitToWidth()) {
      this.applyFitToWidth();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pdfService.loadDocument(file);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.pdfService.loadDocument(file);
    }
  }

  onClosePdf(): void {
    this.pdfService.closePdf();
    this.selectionService.clear();
  }
}
