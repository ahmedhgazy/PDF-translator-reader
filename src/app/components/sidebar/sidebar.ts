import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SelectionService } from '../../services/selection.service';
import { TranslationService } from '../../services/translation.service';
import { TextToSpeechService } from '../../services/text-to-speech.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly selectionService = inject(SelectionService);
  readonly translationService = inject(TranslationService);
  readonly ttsService = inject(TextToSpeechService);

  async onTranslate(): Promise<void> {
    const text = this.selectionService.selectedText();
    if (!text) {
      return;
    }

    await this.translationService.translate({ text });
  }

  speakSelected(): void {
    const text = this.selectionService.selectedText();
    if (text) {
      this.ttsService.speak(text, 'auto');
    }
  }

  speakTranslated(): void {
    const text = this.translationService.translatedText();
    if (text) {
      this.ttsService.speak(text);
    }
  }

  stopSpeaking(): void {
    this.ttsService.stop();
  }

  clearSelection(): void {
    this.selectionService.clear();
    this.translationService.clear();
    this.ttsService.stop();
  }
}
