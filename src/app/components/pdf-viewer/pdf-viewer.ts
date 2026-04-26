import { DecimalPipe } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  viewChild,
  ElementRef,
  effect,
  inject
} from '@angular/core';
import { PdfService } from '../../services/pdf.service';
import { SelectionService } from '../../services/selection.service';

@Component({
  selector: 'app-pdf-viewer',
  imports: [DecimalPipe],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent {
  private readonly pdfService = inject(PdfService);
  private readonly selectionService = inject(SelectionService);
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');
  readonly textLayerRef = viewChild<ElementRef<HTMLDivElement>>('textLayer');

  get pdfServiceRef(): PdfService {
    return this.pdfService;
  }

  constructor() {
    effect(() => {
      const page = this.pdfService.currentPage();
      const scale = this.pdfService.scale();
      const loaded = this.pdfService.isLoaded();
      const canvasEl = this.canvasRef();
      const textLayerEl = this.textLayerRef();

      if (!loaded || !canvasEl || !textLayerEl) {
        return;
      }

      const canvas = canvasEl.nativeElement;
      const textLayer = textLayerEl.nativeElement;

      this.pdfService.renderPage({
        pageNumber: page,
        scale,
        canvas
      }).then(() => {
        this.pdfService.renderTextLayer({
          pageNumber: page,
          scale,
          container: textLayer
        });
      });
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pdfService.loadDocument(file);
    }
  }

  onTextLayerMouseUp(): void {
    const selection = window.getSelection()?.toString().trim() ?? '';
    if (selection.length > 0) {
      this.selectionService.setSelectedText(selection);
    }
  }
}
