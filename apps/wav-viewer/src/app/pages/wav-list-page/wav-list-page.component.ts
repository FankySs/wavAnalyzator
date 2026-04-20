import {
  Component,
  DestroyRef,
  WritableSignal,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { WavFileDto } from '@shared-types';
import { WavApiService } from '../../services/wav-api.service';
import { AudioFileService } from '../../services/audio-file.service';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../components/modal/modal.component';
import { ConfirmInlineComponent } from '../../components/confirm-inline/confirm-inline.component';
import { formatFileSize, formatDate, formatDuration } from '../../utils/format.utils';

@Component({
  selector: 'app-wav-list-page',
  standalone: true,
  templateUrl: './wav-list-page.component.html',
  styleUrls: ['./wav-list-page.component.css'],
  imports: [FormsModule, ModalComponent, ConfirmInlineComponent],
})
export class WavListPageComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly audioFileService = inject(AudioFileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly files: WritableSignal<WavFileDto[]> = signal([]);
  protected readonly isLoading: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string | null> = signal(null);

  // Upload modal
  protected readonly showModal: WritableSignal<boolean> = signal(false);
  protected readonly isDragging: WritableSignal<boolean> = signal(false);
  protected readonly pendingFile: WritableSignal<File | null> = signal(null);
  protected readonly isUploading: WritableSignal<boolean> = signal(false);
  protected readonly uploadError: WritableSignal<string | null> = signal(null);

  // Inline delete confirm
  protected readonly pendingDeleteId: WritableSignal<string | null> = signal(null);
  protected readonly isDeleting: WritableSignal<boolean> = signal(false);

  // Inline rename
  protected readonly renamingId: WritableSignal<string | null> = signal(null);
  protected renameValue = '';
  protected readonly renameError: WritableSignal<string | null> = signal(null);
  protected readonly isRenaming: WritableSignal<boolean> = signal(false);

  private readonly loadTrigger: WritableSignal<number> = signal(0);

  constructor() {
    effect(() => {
      void this.loadTrigger();
      this.loadFiles();
    });
  }

  private loadFiles(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.wavApiService
      .getWavList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (files) => {
          this.files.set(files);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        },
      });
  }

  protected readonly onOpenModal = (): void => {
    this.pendingFile.set(null);
    this.uploadError.set(null);
    this.showModal.set(true);
  };

  protected readonly onCloseModal = (): void => {
    this.showModal.set(false);
    this.pendingFile.set(null);
    this.uploadError.set(null);
  };

  protected readonly onDragOver = (event: DragEvent): void => {
    event.preventDefault();
    this.isDragging.set(true);
  };

  protected readonly onDragLeave = (): void => {
    this.isDragging.set(false);
  };

  protected readonly onDrop = (event: DragEvent): void => {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.pendingFile.set(file);
  };

  protected readonly onFileInputChange = (event: Event): void => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.pendingFile.set(file);
  };

  protected readonly onUpload = (): void => {
    const file = this.pendingFile();
    if (!file) return;

    this.isUploading.set(true);
    this.uploadError.set(null);
    this.audioFileService.setFile(file);

    this.wavApiService
      .uploadWav(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dto) => {
          this.isUploading.set(false);
          this.audioFileService.setWavFileId(dto.id);
          this.showModal.set(false);
          this.loadTrigger.update((v) => v + 1);
          this.router.navigate(['/wav', dto.id]);
        },
        error: (err: Error) => {
          this.isUploading.set(false);
          this.uploadError.set(err.message);
          this.audioFileService.clear();
        },
      });
  };

  protected readonly onRowClick = (id: string): void => {
    this.router.navigate(['/wav', id]);
  };

  protected readonly onDeleteRequest = (id: string, event: Event): void => {
    event.stopPropagation();
    this.pendingDeleteId.set(id);
  };

  protected readonly onDeleteConfirm = (): void => {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.isDeleting.set(true);
    this.wavApiService
      .deleteWav(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.pendingDeleteId.set(null);
          this.loadTrigger.update((v) => v + 1);
        },
        error: (err: Error) => {
          this.isDeleting.set(false);
          this.error.set(err.message);
          this.pendingDeleteId.set(null);
        },
      });
  };

  protected readonly onDeleteCancel = (): void => {
    this.pendingDeleteId.set(null);
  };

  protected readonly onClearPendingFile = (): void => {
    this.pendingFile.set(null);
  };

  protected readonly onRenameStart = (file: WavFileDto, event: Event): void => {
    event.stopPropagation();
    this.renamingId.set(file.id);
    this.renameValue = file.fileName;
    this.renameError.set(null);
  };

  protected readonly onRenameConfirm = (id: string): void => {
    const trimmed = this.renameValue.trim();
    if (!trimmed) {
      this.renameError.set('Název nesmí být prázdný.');
      return;
    }
    if (!trimmed.toLowerCase().endsWith('.wav')) {
      this.renameError.set('Název musí končit příponou .wav.');
      return;
    }

    this.isRenaming.set(true);
    this.renameError.set(null);
    this.wavApiService
      .renameWav(id, { fileName: trimmed })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.files.update((files) => files.map((f) => (f.id === id ? updated : f)));
          this.renamingId.set(null);
          this.isRenaming.set(false);
        },
        error: (err: Error) => {
          this.renameError.set(err.message);
          this.isRenaming.set(false);
        },
      });
  };

  protected readonly onRenameCancel = (): void => {
    this.renamingId.set(null);
    this.renameError.set(null);
  };

  protected readonly onRenameKeydown = (event: KeyboardEvent, id: string): void => {
    if (event.key === 'Enter') this.onRenameConfirm(id);
    if (event.key === 'Escape') this.onRenameCancel();
  };

  protected readonly formatFileSize = formatFileSize;
  protected readonly formatDate = formatDate;

  protected formatDuration(sec: number | null): string {
    if (sec === null) return '–';
    return formatDuration(sec);
  }

  protected formatAudioInfo(file: WavFileDto): string {
    const parts: string[] = [];
    if (file.bitsPerSample) parts.push(`${file.bitsPerSample} bit`);
    if (file.sampleRate) {
      const khz = file.sampleRate / 1000;
      parts.push(`${Number.isInteger(khz) ? khz : khz.toFixed(1)} kHz`);
    }
    if (file.channels !== null) {
      parts.push(file.channels === 1 ? 'Mono' : file.channels === 2 ? 'Stereo' : `${file.channels} kan.`);
    }
    return parts.join(' · ') || '–';
  }
}
