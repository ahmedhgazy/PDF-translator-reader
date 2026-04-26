import { Injectable, signal } from '@angular/core';

export interface SelectionRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  readonly selectedText = signal<string | null>(null);
  readonly selectionRect = signal<SelectionRect | null>(null);
  readonly isPopupVisible = signal(false);

  setSelectedText(text: string, rect?: SelectionRect): void {
    this.selectedText.set(text);
    if (rect) {
      this.selectionRect.set(rect);
      this.isPopupVisible.set(true);
    }
  }

  closePopup(): void {
    this.isPopupVisible.set(false);
  }

  clear(): void {
    this.selectedText.set(null);
    this.selectionRect.set(null);
    this.isPopupVisible.set(false);
  }
}
