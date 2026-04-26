import { Injectable, signal } from '@angular/core';

export interface TranslateOptions {
  text: string;
  source?: string;
  target?: string;
}

export interface LibreTranslateResponse {
  translatedText: string;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' }
];

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly apiUrl = 'http://localhost:5000/translate';
  private readonly cache = new Map<string, string>();

  readonly isLoading = signal(false);
  readonly translatedText = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly targetLanguage = signal<string>('en');

  private getCacheKey(text: string, source: string, target: string): string {
    return `${text}|${source}|${target}`;
  }

  async translate(options: TranslateOptions): Promise<void> {
    const target = options.target ?? this.targetLanguage();
    const source = options.source ?? 'auto';
    const cacheKey = this.getCacheKey(options.text, source, target);

    this.errorMessage.set(null);

    if (this.cache.has(cacheKey)) {
      this.translatedText.set(this.cache.get(cacheKey)!);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.translatedText.set(null);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: options.text,
          source,
          target,
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Translation failed (${response.status}): ${errorBody || response.statusText}`);
      }

      const data = (await response.json()) as LibreTranslateResponse;
      this.cache.set(cacheKey, data.translatedText);
      this.translatedText.set(data.translatedText);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation service unavailable';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  clear(): void {
    this.translatedText.set(null);
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }
}
