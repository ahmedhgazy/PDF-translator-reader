import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ErrorNotificationService, AppError } from '../../services/error-notification.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrl: './notification.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent {
  readonly errorService = inject(ErrorNotificationService);

  trackById(_index: number, error: AppError): number {
    return error.id;
  }
}
