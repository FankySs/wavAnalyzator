import {
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { WavFileDto } from '@shared-types';
import { WavApiService, type WavFilter } from '../../services/wav-api.service';
import { AudioFileService } from '../../services/audio-file.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { ConfirmInlineComponent } from '../../components/confirm-inline/confirm-inline.component';
import { formatFileSize, formatDate, formatDuration } from '../../utils/format.utils';
import { CHUNK_TYPES } from '../../utils/chunk-types';

@Component({
  selector: 'app-wav-list-page',
  standalone: true,
  templateUrl: './wav-list-page.component.html',
  styleUrls: ['./wav-list-page.component.css'],
  imports: [ModalComponent, ConfirmInlineComponent],
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

  // Rename modal
  protected readonly renameModalOpen: WritableSignal<boolean> = signal(false);
  protected readonly renameTarget: WritableSignal<WavFileDto | null> = signal(null);
  protected readonly renameValue: WritableSignal<string> = signal('');
  protected readonly renameError: WritableSignal<string | null> = signal(null);
  protected readonly isRenaming: WritableSignal<boolean> = signal(false);

  // Filter
  protected readonly activeFilter: WritableSignal<WavFilter> = signal({});
  protected readonly pendingFilter: WritableSignal<WavFilter> = signal({});
  protected readonly showFilterModal: WritableSignal<boolean> = signal(false);
  protected readonly hasActiveFilter = computed(() => {
    const f = this.activeFilter();
    return !!(f.name || f.dateFrom || f.dateTo || f.chunkTypes?.length);
  });
  protected readonly activeChips = computed(() => {
    const f = this.activeFilter();
    const chips: { key: keyof WavFilter; label: string }[] = [];
    if (f.name) chips.push({ key: 'name', label: `Name: ${f.name}` });
    if (f.dateFrom) chips.push({ key: 'dateFrom', label: `From: ${f.dateFrom}` });
    if (f.dateTo) chips.push({ key: 'dateTo', label: `To: ${f.dateTo}` });
    if (f.chunkTypes?.length) chips.push({ key: 'chunkTypes', label: `Chunks: ${f.chunkTypes.join(', ')}` });
    return chips;
  });
  protected readonly chunkTypes = CHUNK_TYPES;

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
      .getWavList(this.activeFilter())
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

  protected readonly openRenameModal = (file: WavFileDto): void => {
    this.renameTarget.set(file);
    this.renameValue.set(file.fileName);
    this.renameError.set(null);
    this.renameModalOpen.set(true);
  };

  protected readonly closeRenameModal = (): void => {
    this.renameModalOpen.set(false);
    this.renameTarget.set(null);
    this.renameError.set(null);
  };

  protected readonly onRenameConfirm = (): void => {
    const trimmed = this.renameValue().trim();
    if (!trimmed) {
      this.renameError.set('Name must not be empty.');
      return;
    }
    if (!trimmed.toLowerCase().endsWith('.wav')) {
      this.renameError.set('Name must end with the .wav extension.');
      return;
    }
    const target = this.renameTarget();
    if (!target) return;

    this.isRenaming.set(true);
    this.renameError.set(null);
    this.wavApiService
      .renameWav(target.id, { fileName: trimmed })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.files.update((files) => files.map((f) => (f.id === target.id ? updated : f)));
          this.isRenaming.set(false);
          this.closeRenameModal();
        },
        error: (err: Error) => {
          this.renameError.set(err.message);
          this.isRenaming.set(false);
        },
      });
  };

  protected readonly onOpenFilterModal = (): void => {
    this.pendingFilter.set({ ...this.activeFilter() });
    this.showFilterModal.set(true);
  };

  protected readonly onCloseFilterModal = (): void => {
    this.showFilterModal.set(false);
  };

  protected readonly onApplyFilter = (): void => {
    this.activeFilter.set({ ...this.pendingFilter() });
    this.showFilterModal.set(false);
  };

  protected readonly onRemoveChip = (key: keyof WavFilter): void => {
    this.activeFilter.update((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });
  };

  protected readonly onClearAllFilters = (): void => {
    this.activeFilter.set({});
  };

  protected readonly onPendingNameChange = (val: string): void => {
    this.pendingFilter.update((f) => ({ ...f, name: val || undefined }));
  };

  protected readonly onPendingDateFromChange = (val: string): void => {
    this.pendingFilter.update((f) => ({ ...f, dateFrom: val || undefined }));
  };

  protected readonly onPendingDateToChange = (val: string): void => {
    this.pendingFilter.update((f) => ({ ...f, dateTo: val || undefined }));
  };

  protected readonly onToggleChunkType = (type: string): void => {
    this.pendingFilter.update((f) => {
      const current = f.chunkTypes ?? [];
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...f, chunkTypes: next.length ? next : undefined };
    });
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
      parts.push(file.channels === 1 ? 'Mono' : file.channels === 2 ? 'Stereo' : `${file.channels} ch.`);
    }
    return parts.join(' · ') || '–';
  }
}
