import {
  Component,
  ChangeDetectionStrategy,
  viewChild,
  viewChildren,
  ElementRef,
  effect,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { PdfService } from '../../services/pdf.service';
import { SelectionService } from '../../services/selection.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent implements OnInit, OnDestroy {
  protected readonly pdfService = inject(PdfService);
  protected readonly selectionService = inject(SelectionService);
  private readonly translationService = inject(TranslationService);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');
  readonly textLayerRef = viewChild<ElementRef<HTMLDivElement>>('textLayer');
  readonly wrapperRef = viewChild<ElementRef<HTMLDivElement>>('canvasWrapper');
  readonly pageContainers = viewChildren<ElementRef<HTMLDivElement>>('pageContainer');

  readonly isDragging = signal(false);
  readonly zoomPercent = signal(150);
  readonly isFullscreen = signal(false);

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.pdfService.totalPages() }, (_, i) => i + 1)
  );

  private readonly onDocumentMouseUp = () => this.captureSelection();
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  constructor() {
    // Single page rendering effect
    effect(() => {
      const page = this.pdfService.currentPage();
      const scale = this.pdfService.scale();
      const loaded = this.pdfService.isLoaded();
      const mode = this.pdfService.scrollMode();
      const canvasEl = this.canvasRef();
      const textLayerEl = this.textLayerRef();

      this.zoomPercent.set(Math.round(scale * 100));

      if (!loaded || mode !== 'single' || !canvasEl || !textLayerEl) {
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

    // Continuous scroll mode rendering effect
    effect(() => {
      const loaded = this.pdfService.isLoaded();
      const scale = this.pdfService.scale();
      const mode = this.pdfService.scrollMode();
      const containers = this.pageContainers();

      if (!loaded || mode !== 'continuous' || containers.length === 0) {
        return;
      }

      // Render each page item
      containers.forEach((containerRef) => {
        const el = containerRef.nativeElement;
        const pageNum = parseInt(el.dataset['pageNumber'] || '1', 10);
        const canvas = el.querySelector('canvas') as HTMLCanvasElement;
        const textLayer = el.querySelector('.textLayer') as HTMLDivElement;

        if (canvas && textLayer) {
          this.pdfService.renderPage({ pageNumber: pageNum, scale, canvas }).then((result) => {
            if (result) {
              this.pdfService.renderTextLayer(textLayer, result.viewport, result.textContent);
            }
          });
        }
      });

      this.setupIntersectionObserver();
    });
  }

  ngOnInit(): void {
    this.pdfService.tryRestoreLastPdf();
    document.addEventListener('mouseup', this.onDocumentMouseUp);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.pdfService.isFitToWidth()) {
        this.applyFitToWidth();
      }
    });

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
    this.intersectionObserver?.disconnect();
  }

  private setupIntersectionObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    const wrapper = this.wrapperRef()?.nativeElement;
    if (!wrapper) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            const pageNum = parseInt(
              (entry.target as HTMLElement).dataset['pageNumber'] || '1',
              10
            );
            this.pdfService.currentPage.set(pageNum);
          }
        });
      },
      {
        root: wrapper,
        threshold: [0.1, 0.4, 0.7]
      }
    );

    setTimeout(() => {
      const containers = this.pageContainers();
      containers.forEach((c) => this.intersectionObserver?.observe(c.nativeElement));
    }, 100);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Only capture keyboard shortcuts when user is not typing in an input
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (this.pdfService.isLoaded()) {
      if (event.key === 'ArrowLeft') {
        this.pdfService.previousPage();
      } else if (event.key === 'ArrowRight') {
        this.pdfService.nextPage();
      } else if (event.key === '+' || event.key === '=') {
        this.pdfService.zoomIn();
      } else if (event.key === '-') {
        this.pdfService.zoomOut();
      }
    }
  }

  private captureSelection(): void {
    if (!this.pdfService.isLoaded()) return;
    setTimeout(() => {
      const selection = window.getSelection();
      const wrapper = this.wrapperRef()?.nativeElement;
      
      if (!selection || selection.rangeCount === 0 || !wrapper || !wrapper.contains(selection.anchorNode)) {
        return;
      }

      const rawText = selection.toString();
      const text = this.selectionService.normalizeText(rawText);

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

        // Auto-translate if feature is active
        if (this.selectionService.autoTranslate()) {
          this.translationService.translate({ text });
        }
      }
    }, 50);
  }

  onPageInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    if (!isNaN(val)) {
      this.pdfService.goToPage(val);
      this.scrollToPageInContinuousMode(val);
    }
  }

  scrollToPageInContinuousMode(pageNum: number): void {
    if (this.pdfService.scrollMode() === 'continuous') {
      const target = this.pageContainers().find(
        (c) => c.nativeElement.dataset['pageNumber'] === `${pageNum}`
      );
      if (target) {
        target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  onZoomPresetChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    if (val === 'fit') {
      this.onFitToWidthClick();
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        this.pdfService.setZoomScale(num);
      }
    }
  }

  applyFitToWidth(): void {
    const wrapper = this.wrapperRef();
    if (!wrapper) return;
    const available = wrapper.nativeElement.clientWidth - 48; // Usable width
    if (available <= 0) return;
    this.pdfService.fitToWidth(available);
  }

  onFitToWidthClick(): void {
    this.pdfService.toggleFitToWidth();
    if (this.pdfService.isFitToWidth()) {
      this.applyFitToWidth();
    }
  }

  toggleFullscreen(): void {
    const wrapper = this.wrapperRef()?.nativeElement;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().then(() => this.isFullscreen.set(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => this.isFullscreen.set(false)).catch(() => {});
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

