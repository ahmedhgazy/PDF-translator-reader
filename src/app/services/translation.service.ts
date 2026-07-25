import { Injectable, signal, inject } from '@angular/core';
import { ErrorNotificationService } from './error-notification.service';

export interface TranslateOptions {
  text: string;
  source?: string;
  target?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' }
];

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly errorNotifier = inject(ErrorNotificationService);
  private readonly cache = new Map<string, string>();

  readonly isLoading = signal(false);
  readonly translatedText = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly sourceLanguage = signal<string>('en');
  readonly targetLanguage = signal<string>('ar');

  private getCacheKey(text: string, source: string, target: string): string {
    return `${text}|${source}|${target}`;
  }

  /** Performs translation with automatic multi-provider fallback (Google GTX → MyMemory → Lingva). */
  async translateText(text: string, source: string, target: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const cacheKey = this.getCacheKey(trimmed, source, target);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let result: string | null = null;

    // Provider 1: Google GTX (Works worldwide, unblocked in Egypt & MENA)
    try {
      result = await this.fetchGoogleGtx(trimmed, source, target);
    } catch {
      // Ignore & try next provider
    }

    // Provider 2: MyMemory API
    if (!result) {
      try {
        result = await this.fetchMyMemory(trimmed, source, target);
      } catch {
        // Ignore & try next provider
      }
    }

    // Provider 3: Lingva Translate API
    if (!result) {
      try {
        result = await this.fetchLingva(trimmed, source, target);
      } catch {
        // Ignore
      }
    }

    if (!result) {
      throw new Error('Translation service unavailable. Please check your internet connection.');
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  async translate(options: TranslateOptions): Promise<void> {
    const target = options.target ?? this.targetLanguage();
    const source = options.source ?? this.sourceLanguage();
    const text = options.text.trim();

    if (!text) return;

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      const translated = await this.translateText(text, source, target);
      this.translatedText.set(translated);
    } catch (err) {
      this.errorNotifier.handleFetchError(err, 'translate text');
      const message = err instanceof Error ? err.message : 'Translation service unavailable';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Provider Implementations ─────────────────────────────────────────────

  private async fetchGoogleGtx(text: string, source: string, target: string): Promise<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google GTX error ${res.status}`);

    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const sentences: string[] = data[0].map((item: any) => item[0]).filter(Boolean);
      if (sentences.length > 0) {
        return sentences.join('');
      }
    }
    throw new Error('Invalid response format from Google GTX');
  }

  private async fetchMyMemory(text: string, source: string, target: string): Promise<string> {
    const langPair = `${source}|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory error ${res.status}`);

    const data = await res.json();
    if (data && data.responseData && data.responseStatus === 200) {
      return data.responseData.translatedText;
    }
    throw new Error(data?.responseDetails || 'MyMemory failed');
  }

  private async fetchLingva(text: string, source: string, target: string): Promise<string> {
    const url = `https://lingva.ml/api/v1/${encodeURIComponent(source)}/${encodeURIComponent(target)}/${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lingva error ${res.status}`);

    const data = await res.json();
    if (data && data.translation) {
      return data.translation;
    }
    throw new Error('Lingva failed');
  }

  swapLanguages(): void {
    const src = this.sourceLanguage();
    const tgt = this.targetLanguage();
    this.sourceLanguage.set(tgt);
    this.targetLanguage.set(src);
  }

  clear(): void {
    this.translatedText.set(null);
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }
}

