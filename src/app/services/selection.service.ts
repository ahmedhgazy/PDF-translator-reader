import { Injectable, signal } from '@angular/core';

export interface SelectionRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface VocabularyItem {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  readonly selectedText = signal<string | null>(null);
  readonly rawSelectedText = signal<string | null>(null);
  readonly selectionRect = signal<SelectionRect | null>(null);
  readonly isPopupVisible = signal(false);
  readonly autoTranslate = signal<boolean>(
    localStorage.getItem('pdf_reader_auto_translate') !== 'false'
  );
  readonly vocabulary = signal<VocabularyItem[]>(this.loadVocabulary());
  readonly theme = signal<'dark' | 'light'>(
    (localStorage.getItem('pdf_reader_theme') as 'dark' | 'light') || 'dark'
  );

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem('pdf_reader_theme', next);
    this.applyTheme(next);
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  /** Normalizes selected text for higher accuracy in translation & dictionary lookup. */
  normalizeText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Join words broken by end-of-line hyphens (e.g. "trans-\nlation" -> "translation")
    cleaned = cleaned.replace(/(\w+)-\s*[\r\n]+\s*(\w+)/g, '$1$2');

    // 2. Replace all remaining linebreaks and tabs with a single space
    cleaned = cleaned.replace(/[\r\n\t]+/g, ' ');

    // 3. Collapse multiple whitespace characters into a single space
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 4. If the result is a single word (no spaces), strip leading/trailing quotes, brackets, and punctuation
    if (cleaned.length > 0 && !cleaned.includes(' ')) {
      // Strips leading/trailing punctuation characters like () [] {} "" '' , . ; : ! ? “ ” « »
      cleaned = cleaned.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
    }

    return cleaned;
  }

  setSelectedText(text: string, rect?: SelectionRect): void {
    const normalized = this.normalizeText(text);
    if (!normalized) return;

    this.rawSelectedText.set(text);
    this.selectedText.set(normalized);

    if (rect) {
      this.selectionRect.set(rect);
      this.isPopupVisible.set(true);
    }
  }

  toggleAutoTranslate(): void {
    const next = !this.autoTranslate();
    this.autoTranslate.set(next);
    localStorage.setItem('pdf_reader_auto_translate', String(next));
  }

  closePopup(): void {
    this.isPopupVisible.set(false);
  }

  clear(): void {
    this.selectedText.set(null);
    this.rawSelectedText.set(null);
    this.selectionRect.set(null);
    this.isPopupVisible.set(false);
  }

  // ─── Vocabulary Management ───────────────────────────────────────────────
  private loadVocabulary(): VocabularyItem[] {
    try {
      const data = localStorage.getItem('pdf_reader_vocabulary');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveVocabulary(items: VocabularyItem[]): void {
    try {
      localStorage.setItem('pdf_reader_vocabulary', JSON.stringify(items));
    } catch {
      // Silently ignore write errors
    }
  }

  addVocabulary(originalText: string, translatedText: string, sourceLang: string, targetLang: string): void {
    const newItem: VocabularyItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      originalText: originalText.trim(),
      translatedText: translatedText.trim(),
      sourceLang,
      targetLang,
      timestamp: Date.now()
    };

    const updated = [newItem, ...this.vocabulary().filter(i => i.originalText.toLowerCase() !== originalText.trim().toLowerCase())];
    this.vocabulary.set(updated);
    this.saveVocabulary(updated);
  }

  removeVocabulary(id: string): void {
    const updated = this.vocabulary().filter(item => item.id !== id);
    this.vocabulary.set(updated);
    this.saveVocabulary(updated);
  }

  clearVocabulary(): void {
    this.vocabulary.set([]);
    this.saveVocabulary([]);
  }

  isSavedInVocabulary(originalText: string | null): boolean {
    if (!originalText) return false;
    const lower = originalText.trim().toLowerCase();
    return this.vocabulary().some(item => item.originalText.toLowerCase() === lower);
  }
}

