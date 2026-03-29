import {
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import type { WavChunkDto, WavFileDetailDto } from '@shared-types';
import { WavApiService } from '../../services/wav-api.service';
import { AudioFileService } from '../../services/audio-file.service';
import { AudioParamCardComponent } from '../../components/audio-param-card/audio-param-card.component';
import { ChunkBadgeComponent } from '../../components/chunk-badge/chunk-badge.component';
import { ConfirmInlineComponent } from '../../components/confirm-inline/confirm-inline.component';
import { WaveformPlayerComponent } from '../../components/waveform-player/waveform-player.component';
import { getChunkName } from '../../utils/chunk-names';
import { formatFileSize, formatDate } from '../../utils/format.utils';

@Component({
  selector: 'app-wav-detail-page',
  standalone: true,
  templateUrl: './wav-detail-page.component.html',
  styleUrls: ['./wav-detail-page.component.css'],
  imports: [RouterLink, AudioParamCardComponent, ChunkBadgeComponent, ConfirmInlineComponent, WaveformPlayerComponent],
})
export class WavDetailPageComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly audioFileService = inject(AudioFileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly isLoading: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string | null> = signal(null);
  protected readonly detail: WritableSignal<WavFileDetailDto | null> = signal(null);
  protected readonly pendingDeleteChunkId: WritableSignal<string | null> = signal(null);
  protected readonly isDeletingChunk: WritableSignal<boolean> = signal(false);
  protected readonly isDownloading: WritableSignal<boolean> = signal(false);
  protected readonly downloadError: WritableSignal<string | null> = signal(null);

  protected readonly sampleRateLabel = computed(() =>
    this.detail()?.sampleRate ? `${(this.detail()!.sampleRate! / 1000).toFixed(this.detail()!.sampleRate! % 1000 === 0 ? 0 : 1)} kHz` : '–',
  );
  protected readonly bitDepthLabel = computed(() =>
    this.detail()?.bitsPerSample ? `${this.detail()!.bitsPerSample} bit` : '–',
  );
  protected readonly channelsLabel = computed(() => {
    const ch = this.detail()?.channels;
    if (ch === null || ch === undefined) return '–';
    return ch === 1 ? 'Mono' : ch === 2 ? 'Stereo' : `${ch} kanálů`;
  });
  protected readonly durationLabel = computed(() => {
    const sec = this.detail()?.durationSec;
    if (sec === null || sec === undefined) return '–';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.detail.set(null);
      this.error.set(null);
      this.pendingDeleteChunkId.set(null);
      this.loadDetail(id);
    });
  }

  private loadDetail(id: string): void {
    this.isLoading.set(true);
    this.wavApiService
      .getWavDetail(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.audioFileService.setWavMeta(detail.sampleRate ?? null, detail.durationSec ?? null);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        },
      });
  }

  protected chunkName(chunkId: string): string {
    return getChunkName(chunkId);
  }

  protected readonly onChunkClick = (chunk: WavChunkDto): void => {
    if (this.pendingDeleteChunkId()) return;
    this.router.navigate(['/wav', this.id(), 'chunks', chunk.id]);
  };

  protected readonly onDeleteChunkRequest = (chunkId: string, event: Event): void => {
    event.stopPropagation();
    this.pendingDeleteChunkId.set(chunkId);
  };

  protected readonly onDeleteChunkConfirm = (): void => {
    const chunkId = this.pendingDeleteChunkId();
    if (!chunkId) return;

    this.isDeletingChunk.set(true);
    this.wavApiService
      .deleteChunk(this.id(), chunkId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeletingChunk.set(false);
          this.pendingDeleteChunkId.set(null);
          this.loadDetail(this.id());
        },
        error: (err: Error) => {
          this.isDeletingChunk.set(false);
          this.error.set(err.message);
          this.pendingDeleteChunkId.set(null);
        },
      });
  };

  protected readonly onDeleteChunkCancel = (): void => {
    this.pendingDeleteChunkId.set(null);
  };

  protected readonly onDownloadClick = (): void => {
    const id = this.id();
    this.isDownloading.set(true);
    this.downloadError.set(null);

    this.wavApiService
      .downloadWav(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.detail()?.fileName ?? 'download.wav';
          a.click();
          URL.revokeObjectURL(url);
          this.isDownloading.set(false);
        },
        error: () => {
          this.downloadError.set('Stažení se nezdařilo. Zkuste to znovu.');
          this.isDownloading.set(false);
        },
      });
  };

  protected readonly formatSize = formatFileSize;
  protected readonly formatDate = formatDate;
}