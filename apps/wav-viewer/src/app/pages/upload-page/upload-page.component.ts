import { Component, Signal, WritableSignal, signal, inject, effect } from '@angular/core';
import { AudioFileService } from '../../services/audio-file.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  templateUrl: './upload-page.component.html',
  styleUrls: ['./upload-page.component.css'],
  imports: [RouterLink],
})
export class UploadPageComponent {
  private readonly audioFileService: AudioFileService = inject(AudioFileService);

  protected readonly fileName: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly fileSize: WritableSignal<number | null> = signal<number | null>(null);
  protected readonly objectUrl: Signal<string | null> = this.audioFileService.objectUrl;

  constructor() {
    effect(() => {
      const file = this.audioFileService.file();
      this.fileName.set(file ? file.name : null);
      this.fileSize.set(file ? file.size : null);
    });
  }

  protected readonly onFileSelected: (evt: Event) => void = (evt: Event): void => {
    const input = evt.target as HTMLInputElement | null;
    const file: File | undefined = input?.files?.[0];

    if (!file) {
      this.fileName.set(null);
      this.fileSize.set(null);
      this.audioFileService.clear();
      return;
    }

    this.fileName.set(file.name);
    this.fileSize.set(file.size);
    this.audioFileService.setFile(file);

    void file.arrayBuffer().then((_buf: ArrayBuffer) => {
      // případný debug/preview hlavičky
    });
  };

  protected readonly onClearClick: () => void = (): void => {
    this.audioFileService.clear();
    this.fileName.set(null);
    this.fileSize.set(null);
  };
}
