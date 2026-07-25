import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { SelectionService } from '../../services/selection.service';
import { TranslationService, SUPPORTED_LANGUAGES } from '../../services/translation.service';
import { TextToSpeechService } from '../../services/text-to-speech.service';

export type SidebarTab = 'translate' | 'vocabulary' | 'settings';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  protected readonly selectionService = inject(SelectionService);
  protected readonly translationService = inject(TranslationService);
  protected readonly ttsService = inject(TextToSpeechService);
  readonly languages = SUPPORTED_LANGUAGES;

  readonly activeTab = signal<SidebarTab>('translate');
  readonly copied = signal(false);
  readonly vocabSearch = signal('');

  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  async onTranslate(): Promise<void> {
    const text = this.selectionService.selectedText();
    if (!text) return;
    await this.translationService.translate({ text });
  }

  onSourceLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.translationService.sourceLanguage.set(select.value);
  }

  onTargetLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.translationService.targetLanguage.set(select.value);
  }

  onSwapLanguages(): void {
    this.translationService.swapLanguages();
  }

  speakText(text: string, lang: string): void {
    if (text) {
      this.ttsService.speak(text, lang);
    }
  }

  speakSelected(): void {
    const text = this.selectionService.selectedText();
    if (text) {
      this.speakText(text, this.translationService.sourceLanguage());
    }
  }

  speakTranslated(): void {
    const text = this.translationService.translatedText();
    if (text) {
      this.speakText(text, this.translationService.targetLanguage());
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

  async copyTranslation(): Promise<void> {
    const text = this.translationService.translatedText();
    if (text) {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copied.set(false), 1500);
    }
  }

  saveToVocabulary(): void {
    const original = this.selectionService.selectedText();
    const translated = this.translationService.translatedText();
    if (original && translated) {
      this.selectionService.addVocabulary(
        original,
        translated,
        this.translationService.sourceLanguage(),
        this.translationService.targetLanguage()
      );
    }
  }

  removeVocabulary(id: string): void {
    this.selectionService.removeVocabulary(id);
  }

  clearAllVocabulary(): void {
    this.selectionService.clearVocabulary();
  }

  setTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
  }
}

