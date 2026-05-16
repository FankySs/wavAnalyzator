import {
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { FactParsed, UpdateFactDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { AudioParamCardComponent } from '../../../../components/audio-param-card/audio-param-card.component';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const FACT_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',           byteOffset: 0, byteLength: 4, color: 'var(--brand)',   description: '4bajtový ASCII identifikátor chunku' },
  { label: 'Size',         byteOffset: 4, byteLength: 4, color: 'var(--success)', description: 'Velikost těla chunku v bajtech' },
  { label: 'Sample Count', byteOffset: 8, byteLength: 4, color: 'var(--warning)', description: 'Celkový počet vzorků na kanál (uint32, little-endian)' },
];

@Component({
  selector: 'app-fact-detail',
  standalone: true,
  templateUrl: './fact-detail.component.html',
  styleUrls: ['./fact-detail.component.css'],
  imports: [FormsModule, AudioParamCardComponent, ChunkHexViewerComponent],
})
export class FactDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly factHighlights: ChunkHighlight[] = FACT_HIGHLIGHTS;

  protected readonly fact = computed((): FactParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'fact' ? parsed : null;
  });

  protected readonly sampleLengthLabel = computed((): string => {
    const f = this.fact();
    return f !== null ? f.sampleLength.toLocaleString('cs-CZ') : '–';
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected formSampleLength = 0;

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected readonly onEditClick = (): void => {
    const f = this.fact();
    if (!f) return;
    this.formSampleLength = f.sampleLength;
    this.saveError.set(null);
    this.isEditing.set(true);
  };

  protected readonly onCancelClick = (): void => {
    this.isEditing.set(false);
    this.saveError.set(null);
  };

  protected readonly onSaveClick = (): void => {
    const live = this.liveChunk();
    if (!live) return;

    const dto: UpdateFactDto = { sampleLength: this.formSampleLength };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateFact(this.wavId(), live.id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.liveChunk.set(updated);
          this.isSaving.set(false);
          this.savingChange.emit(false);
          this.isEditing.set(false);
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.savingChange.emit(false);
          this.saveError.set(err.message);
        },
      });
  };
}