import { Component, DestroyRef, WritableSignal, inject, input, output, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../services/wav-api.service';
import { ChunkBadgeComponent } from '../chunk-badge/chunk-badge.component';
import { ConfirmInlineComponent } from '../confirm-inline/confirm-inline.component';
import { getChunkName } from '../../utils/chunk-names';
import { formatFileSize } from '../../utils/format.utils';

const NON_DELETABLE_IDS = new Set(['fmt ', 'data', 'JUNK', 'PAD ', 'FLLR']);

@Component({
  selector: 'app-chunk-detail-header',
  standalone: true,
  templateUrl: './chunk-detail-header.component.html',
  styleUrls: ['./chunk-detail-header.component.css'],
  imports: [RouterLink, ChunkBadgeComponent, ConfirmInlineComponent],
})
export class ChunkDetailHeaderComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();
  readonly isSaving = input<boolean>(false);

  readonly deleted = output<void>();

  protected readonly isDeleting: WritableSignal<boolean> = signal(false);
  protected readonly showConfirm: WritableSignal<boolean> = signal(false);
  protected readonly deleteError: WritableSignal<string | null> = signal(null);

  protected readonly isDeletable = computed(() => {
    const c = this.chunk();
    return !c.isAudioData && !NON_DELETABLE_IDS.has(c.chunkId) && c.parsed?.chunkType !== 'unknown';
  });

  protected chunkName(chunkId: string): string {
    return getChunkName(chunkId);
  }

  protected readonly formatSize = formatFileSize;

  protected readonly onDeleteRequest = (): void => {
    this.showConfirm.set(true);
    this.deleteError.set(null);
  };

  protected readonly onDeleteCancel = (): void => {
    this.showConfirm.set(false);
  };

  protected readonly onDeleteConfirm = (): void => {
    this.isDeleting.set(true);
    this.wavApiService
      .deleteChunk(this.wavId(), this.chunk().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deleted.emit();
        },
        error: (err: Error) => {
          this.isDeleting.set(false);
          this.showConfirm.set(false);
          this.deleteError.set(err.message);
        },
      });
  };
}