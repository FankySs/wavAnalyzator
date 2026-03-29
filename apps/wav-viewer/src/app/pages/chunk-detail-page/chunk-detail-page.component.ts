import {
  Component,
  DestroyRef,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../services/wav-api.service';
import { AudioFileService } from '../../services/audio-file.service';
import { ChunkDetailHeaderComponent } from '../../components/chunk-detail-header/chunk-detail-header.component';
import {
  AdtlDetailComponent,
  AxmlDetailComponent,
  BextDetailComponent,
  CartDetailComponent,
  CueDetailComponent,
  DataDetailComponent,
  DispDetailComponent,
  FactDetailComponent,
  FmtDetailComponent,
  InstDetailComponent,
  IxmlDetailComponent,
  JunkDetailComponent,
  LevlDetailComponent,
  ListInfoDetailComponent,
  MextDetailComponent,
  PeakDetailComponent,
  SmplDetailComponent,
  UmidDetailComponent,
  UnknownDetailComponent,
} from '../chunks';

@Component({
  selector: 'app-chunk-detail-page',
  standalone: true,
  templateUrl: './chunk-detail-page.component.html',
  imports: [
    ChunkDetailHeaderComponent,
    FmtDetailComponent,
    ListInfoDetailComponent,
    BextDetailComponent,
    CueDetailComponent,
    SmplDetailComponent,
    FactDetailComponent,
    PeakDetailComponent,
    InstDetailComponent,
    CartDetailComponent,
    DispDetailComponent,
    IxmlDetailComponent,
    AxmlDetailComponent,
    UmidDetailComponent,
    MextDetailComponent,
    LevlDetailComponent,
    AdtlDetailComponent,
    JunkDetailComponent,
    UnknownDetailComponent,
    DataDetailComponent,
  ],
})
export class ChunkDetailPageComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly audioFileService = inject(AudioFileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();
  readonly chunkId = input.required<string>();

  protected readonly isLoading: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string | null> = signal(null);
  protected readonly chunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly sampleRate: Signal<number | undefined> = computed(
    () => this.audioFileService.wavSampleRate() ?? undefined,
  );

  constructor() {
    effect(() => {
      const id = this.id();
      const chunkId = this.chunkId();
      this.chunk.set(null);
      this.error.set(null);
      this.loadChunk(id, chunkId);
    });
  }

  private loadChunk(wavId: string, chunkId: string): void {
    this.isLoading.set(true);
    this.wavApiService
      .getChunkDetail(wavId, chunkId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chunk) => {
          this.chunk.set(chunk);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        },
      });
  }

  protected readonly onChunkDeleted = (): void => {
    this.router.navigate(['/wav', this.id()]);
  };

  protected readonly onSavingChange = (value: boolean): void => {
    this.isSaving.set(value);
  };
}