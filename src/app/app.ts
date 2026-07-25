import { Component, ChangeDetectionStrategy, signal, HostListener, inject } from '@angular/core';
import { PdfViewerComponent } from './components/pdf-viewer/pdf-viewer';
import { SidebarComponent } from './components/sidebar/sidebar';
import { TranslationPopupComponent } from './components/translation-popup/translation-popup';
import { NotificationComponent } from './components/notification/notification';
import { SelectionService } from './services/selection.service';

@Component({
  selector: 'app-root',
  imports: [PdfViewerComponent, SidebarComponent, TranslationPopupComponent, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly selectionService = inject(SelectionService);
  readonly sidebarOpen = signal(true);
  readonly showShortcutsModal = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  toggleShortcutsModal(): void {
    this.showShortcutsModal.update(v => !v);
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      this.toggleShortcutsModal();
    }
  }
}

