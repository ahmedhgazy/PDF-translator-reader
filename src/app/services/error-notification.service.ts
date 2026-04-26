import { Injectable, signal } from '@angular/core';

export interface AppError {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'info';
  autoDismiss: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorNotificationService {
  private nextId = 0;
  private autoDismissMs = 6000;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly errors = signal<AppError[]>([]);

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.onConnectivityChange(true));
    window.addEventListener('offline', () => this.onConnectivityChange(false));
  }

  private onConnectivityChange(online: boolean): void {
    this.isOnline.set(online);
    if (online) {
      this.show({ message: "You're back online.", type: 'info', autoDismiss: true });
    } else {
      this.show({ message: 'No internet connection. Translation requires network access.', type: 'warning', autoDismiss: false });
    }
  }

  show(options: { message: string; type?: 'error' | 'warning' | 'info'; autoDismiss?: boolean }): void {
    const id = this.nextId++;
    const error: AppError = {
      id,
      message: options.message,
      type: options.type ?? 'error',
      autoDismiss: options.autoDismiss ?? true
    };

    this.errors.update(errors => [...errors, error]);

    if (error.autoDismiss) {
      const timer = setTimeout(() => this.dismiss(id), this.autoDismissMs);
      this.timers.set(id, timer);
    }
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.errors.update(errors => errors.filter(e => e.id !== id));
  }

  /** Classify a fetch/network error and show an appropriate message. */
  handleFetchError(err: unknown, context: string): void {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      this.show({
        message: `No internet connection \u2014 can't ${context}.`,
        type: 'warning',
        autoDismiss: false
      });
    } else if (err instanceof Error) {
      this.show({ message: `${context} failed: ${err.message}`, type: 'error' });
    } else {
      this.show({ message: `${context} failed due to an unexpected error.`, type: 'error' });
    }
  }
}
