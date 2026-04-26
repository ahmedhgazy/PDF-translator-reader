import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  readonly selectedText = signal<string | null>(null);

  setSelectedText(text: string | null): void {
    this.selectedText.set(text);
  }

  clear(): void {
    this.selectedText.set(null);
  }
}
