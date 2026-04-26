import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SelectionService } from '../../services/selection.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly selectionService = inject(SelectionService);
  readonly translationService = inject(TranslationService);

  async onTranslate(): Promise<void> {
    const text = this.selectionService.selectedText();
    if (!text) {
      return;
    }

    await this.translationService.translate({ text });
  }
}
