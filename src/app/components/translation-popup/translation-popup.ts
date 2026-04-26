import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  OnDestroy,
  signal,
  ElementRef,
  viewChild
} from '@angular/core';
import { SelectionService } from '../../services/selection.service';
import { TranslationService } from '../../services/translation.service';
import { TextToSpeechService } from '../../services/text-to-speech.service';

@Component({
  selector: 'app-translation-popup',
  templateUrl: './translation-popup.html',
  styleUrl: './translation-popup.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationPopupComponent implements OnInit, OnDestroy {
  protected readonly selectionService = inject(SelectionService);
  protected readonly translationService = inject(TranslationService);
  protected readonly ttsService = inject(TextToSpeechService);

  readonly popupRef = viewChild<ElementRef<HTMLDivElement>>('popup');

  /** Local translation state so popup doesn't conflict with sidebar */
  readonly localTranslation = signal<string | null>(null);
  readonly localError = signal<string | null>(null);
  readonly localLoading = signal(false);
  readonly copied = signal(false);

  // Dragging state
  readonly dragOffset = signal({x: 0, y: 0});
  private isDragging = false;
  private dragStartPos = {x: 0, y: 0};

  private copyTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly onClickOutside = (e: MouseEvent) => this.handleOutsideClick(e);
  private readonly onScroll = () => this.selectionService.closePopup();
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };
  private readonly onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private readonly onMouseUp = (e: MouseEvent) => this.handleMouseUp(e);

  /** Position the popup above/below the selection, clamped to viewport. */
  readonly popupStyle = computed(() => {
    const rect = this.selectionService.selectionRect();
    const visible = this.selectionService.isPopupVisible();
    if (!rect || !visible) return { display: 'none' };

    const popupW = 320;
    const popupH = 260; // estimated
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: center on selection, clamped to viewport
    let left = rect.left + rect.width / 2 - popupW / 2;
    left = Math.max(margin, Math.min(left, vw - popupW - margin));

    // Vertical: prefer above the selection
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    let top: number;
    let showAbove: boolean;

    if (spaceAbove >= popupH + margin) {
      top = rect.top - popupH - margin;
      showAbove = true;
    } else if (spaceBelow >= popupH + margin) {
      top = rect.bottom + margin;
      showAbove = false;
    } else {
      // Not enough space either way — pick whichever side has more room
      showAbove = spaceAbove > spaceBelow;
      top = showAbove
        ? Math.max(margin, rect.top - popupH - margin)
        : Math.min(rect.bottom + margin, vh - popupH - margin);
    }

    const offset = this.dragOffset();
    return {
      display: 'block',
      left: `${Math.round(left + offset.x)}px`,
      top: `${Math.round(top + offset.y)}px`,
      '--arrow-side': showAbove ? 'bottom' : 'top'
    } as Record<string, string>;
  });

  /** Arrow position: centers horizontally on the selection */
  readonly arrowStyle = computed(() => {
    const rect = this.selectionService.selectionRect();
    const visible = this.selectionService.isPopupVisible();
    if (!rect || !visible) return {};

    const popupW = 320;
    const margin = 10;
    const vw = window.innerWidth;

    let popupLeft = rect.left + rect.width / 2 - popupW / 2;
    popupLeft = Math.max(margin, Math.min(popupLeft, vw - popupW - margin));

    const selectionCenterX = rect.left + rect.width / 2;
    const offset = this.dragOffset();
    const arrowLeft = selectionCenterX - (popupLeft + offset.x);
    const clamped = Math.max(16, Math.min(arrowLeft, popupW - 16));

    // Hide arrow if dragged far away
    if (Math.abs(offset.x) > 50 || Math.abs(offset.y) > 50) {
      return { display: 'none' };
    }

    return { left: `${Math.round(clamped)}px` };
  });

  ngOnInit(): void {
    document.addEventListener('mousedown', this.onClickOutside);
    document.addEventListener('scroll', this.onScroll, true);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.onClickOutside);
    document.removeEventListener('scroll', this.onScroll, true);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
  }

  private handleOutsideClick(e: MouseEvent): void {
    const popup = this.popupRef()?.nativeElement;
    // Don't close if we are just dragging
    if (this.isDragging) return;
    if (popup && !popup.contains(e.target as Node)) {
      this.close();
    }
  }

  onDragStart(e: MouseEvent): void {
    // Only drag with left click and not on the close button
    if (e.button !== 0 || (e.target as HTMLElement).closest('.popup-close')) return;
    this.isDragging = true;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartPos.x;
    const dy = e.clientY - this.dragStartPos.y;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.dragOffset.update(offset => ({ x: offset.x + dx, y: offset.y + dy }));
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  close(): void {
    this.selectionService.closePopup();
    this.localTranslation.set(null);
    this.localError.set(null);
    this.ttsService.stop();
    this.dragOffset.set({x: 0, y: 0});
    
    // Clear the browser's native text selection so the document 'mouseup' 
    // listener doesn't immediately re-detect it and pop it back open.
    window.getSelection()?.removeAllRanges();
  }

  async onTranslate(): Promise<void> {
    const text = this.selectionService.selectedText();
    if (!text || this.localLoading()) return;

    this.localError.set(null);
    this.localLoading.set(true);
    this.localTranslation.set(null);

    try {
      const source = this.translationService.sourceLanguage();
      const target = this.translationService.targetLanguage();
      const langPair = `${source}|${target}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json() as {
        responseData: { translatedText: string };
        responseStatus: number;
        responseDetails: string;
      };

      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || 'Translation failed');
      }

      const translated = data.responseData.translatedText;
      this.localTranslation.set(translated);

      // Also sync to sidebar TranslationService so sidebar stays updated
      this.translationService.translate({ text, source, target });

    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      this.localLoading.set(false);
    }
  }

  speakSource(): void {
    const text = this.selectionService.selectedText();
    if (text) this.ttsService.speak(text, this.translationService.sourceLanguage());
  }

  speakTranslation(): void {
    const text = this.localTranslation();
    if (text) this.ttsService.speak(text, this.translationService.targetLanguage());
  }

  async copyTranslation(): Promise<void> {
    const text = this.localTranslation();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    this.copied.set(true);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => this.copied.set(false), 1500);
  }
}
