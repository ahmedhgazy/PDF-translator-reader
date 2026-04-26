import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {
  readonly isSpeaking = signal(false);
  readonly isSupported = signal(typeof window !== 'undefined' && 'speechSynthesis' in window);

  speak(text: string, lang = 'en-US'): void {
    if (!this.isSupported() || !text.trim()) {
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (!this.isSupported()) {
      return;
    }
    window.speechSynthesis.cancel();
    this.isSpeaking.set(false);
  }
}
