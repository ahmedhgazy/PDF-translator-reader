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

@Component({
  selector: 'app-pdf-viewer',
  imports: [DecimalPipe],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent {
  private readonly pdfService = inject(PdfService);
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');

  get pdfServiceRef(): PdfService {
    return this.pdfService;
  }

  constructor() {
    effect(() => {
      const page = this.pdfService.currentPage();
      const scale = this.pdfService.scale();
      const loaded = this.pdfService.isLoaded();
      const canvasEl = this.canvasRef();

      if (!loaded || !canvasEl) {
        return;
      }

      this.pdfService.renderPage({
        pageNumber: page,
        scale,
        canvas: canvasEl.nativeElement
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
}
