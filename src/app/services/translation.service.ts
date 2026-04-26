import { Injectable, signal } from '@angular/core';

export interface TranslateOptions {
  text: string;
  source?: string;
  target?: string;
}

export interface LibreTranslateResponse {
  translatedText: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly apiUrl = 'http://localhost:5000/translate';

  readonly isLoading = signal(false);
  readonly translatedText = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async translate(options: TranslateOptions): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.translatedText.set(null);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: options.text,
          source: options.source ?? 'auto',
          target: options.target ?? 'en',
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Translation failed (${response.status}): ${errorBody || response.statusText}`);
      }

      const data = (await response.json()) as LibreTranslateResponse;
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
