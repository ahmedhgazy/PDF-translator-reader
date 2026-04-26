import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { PdfViewerComponent } from './components/pdf-viewer/pdf-viewer';
import { SidebarComponent } from './components/sidebar/sidebar';
import { TranslationPopupComponent } from './components/translation-popup/translation-popup';

@Component({
  selector: 'app-root',
  imports: [PdfViewerComponent, SidebarComponent, TranslationPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  readonly sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }
}
