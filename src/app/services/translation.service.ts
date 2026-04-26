import { Injectable, signal } from '@angular/core';

export interface TranslateOptions {
  text: string;
  source?: string;
  target?: string;
}

// ─── MyMemory API response ────────────────────────────────────────────────────
export interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  responseStatus: number;
  responseDetails: string;
}

// ─── Language options ─────────────────────────────────────────────────────────
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
  // ─── API #1 (ACTIVE): MyMemory ─────────────────────────────────────────────
  //
  //  • Free, no API key required for anonymous use
  //  • Limit: ~5 000 characters/day per IP (anonymous)
  //  • Supports EN ↔ AR and 50+ language pairs
  //  • Docs: https://mymemory.translated.net/doc/spec.php
  //
  private readonly myMemoryUrl = 'https://api.mymemory.translated.net/get';

  // ─── API #2 (FALLBACK — uncomment to use): Lingva Translate ───────────────
  //
  //  • Completely free, no API key, open-source Google Translate frontend
  //  • No daily limit (community-hosted)
  //  • Supports EN ↔ AR and 100+ language pairs
  //  • Docs: https://github.com/thedaviddelta/lingva-translate
  //  • Endpoint: GET https://lingva.ml/api/v1/{source}/{target}/{encodedText}
  //  • Response: { translation: "..." }
  //
  //  Usage — swap the translate() method body with this implementation:
  //
  // private readonly lingvaUrl = 'https://lingva.ml/api/v1';
  //
  // private async translateWithLingva(text: string, source: string, target: string): Promise<string> {
  //   const url = `${this.lingvaUrl}/${source}/${target}/${encodeURIComponent(text)}`;
  //   const response = await fetch(url);
  //   if (!response.ok) {
  //     throw new Error(`Translation failed (${response.status}): ${response.statusText}`);
  //   }
  //   const data = await response.json() as { translation: string };
  //   return data.translation;
  // }
  //
  // Note: Lingva uses 'auto' for source auto-detection.
  // Note: If lingva.ml is down, mirror instances: https://lingva.garudalinux.org
  //       Replace the base URL above with any working mirror.
  // ──────────────────────────────────────────────────────────────────────────

  private readonly cache = new Map<string, string>();

  readonly isLoading = signal(false);
  readonly translatedText = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly sourceLanguage = signal<string>('en');
  readonly targetLanguage = signal<string>('ar');

  private getCacheKey(text: string, source: string, target: string): string {
    return `${text}|${source}|${target}`;
  }

  async translate(options: TranslateOptions): Promise<void> {
    const target = options.target ?? this.targetLanguage();
    const source = options.source ?? this.sourceLanguage();
    const text = options.text.trim();

    if (!text) return;

    const cacheKey = this.getCacheKey(text, source, target);
    this.errorMessage.set(null);

    if (this.cache.has(cacheKey)) {
      this.translatedText.set(this.cache.get(cacheKey)!);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.translatedText.set(null);

    try {
      // ── Using MyMemory (API #1) ────────────────────────────────────────────
      const langPair = `${source}|${target}`;
      const url = `${this.myMemoryUrl}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Translation failed (${response.status}): ${response.statusText}`);
      }

      const data = (await response.json()) as MyMemoryResponse;

      if (data.responseStatus !== 200) {
        // Status 429 = daily limit exceeded → switch to Lingva (API #2)
        throw new Error(
          data.responseStatus === 429
            ? 'Daily limit reached. Switch to Lingva API (see comments in translation.service.ts).'
            : (data.responseDetails || 'Translation service returned an error')
        );
      }

      const translated = data.responseData.translatedText;
      this.cache.set(cacheKey, translated);
      this.translatedText.set(translated);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation service unavailable';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
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
