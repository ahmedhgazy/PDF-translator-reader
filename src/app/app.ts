import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PdfViewerComponent } from './components/pdf-viewer/pdf-viewer';
import { SidebarComponent } from './components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [PdfViewerComponent, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
}
