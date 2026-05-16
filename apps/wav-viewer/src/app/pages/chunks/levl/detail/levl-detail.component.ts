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
import type { LevlParsed, UpdateLevlDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const LEVL_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',                 byteOffset: 0,   byteLength: 4,  color: 'var(--brand)',   description: '4bajtový ASCII identifikátor chunku' },
  { label: 'Size',               byteOffset: 4,   byteLength: 4,  color: 'var(--success)', description: 'Velikost těla chunku v bajtech' },
  { label: 'Version',            byteOffset: 8,   byteLength: 4,  color: 'var(--warning)', description: 'Verze formátu (uint32, obvykle 1)' },
  { label: 'Format',             byteOffset: 12,  byteLength: 4,  color: 'var(--danger)',  description: 'Formát peak dat (uint32, 1 = uint8)' },
  { label: 'Points/Value',       byteOffset: 16,  byteLength: 4,  color: '#b388ff',        description: 'Počet peak hodnot na kanál (uint32)' },
  { label: 'Channel Count',      byteOffset: 20,  byteLength: 4,  color: '#80cbc4',        description: 'Počet kanálů (uint32)' },
  { label: 'Sample Frame Count', byteOffset: 24,  byteLength: 4,  color: '#ffab40',        description: 'Celkový počet sample rámců (uint32)' },
  { label: 'Peak Frames',        byteOffset: 28,  byteLength: 4,  color: '#f48fb1',        description: 'Velikost peak rámce v samplich (uint32)' },
  { label: 'Pos Type',           byteOffset: 32,  byteLength: 4,  color: '#a5d6a7',        description: 'Typ pozice (uint32)' },
  { label: 'Offset',             byteOffset: 36,  byteLength: 4,  color: '#ce93d8',        description: 'Offset prvního peak rámce (uint32)' },
  { label: 'Timestamp',          byteOffset: 40,  byteLength: 4,  color: '#80deea',        description: 'Unix timestamp vytvoření (uint32)' },
  { label: 'Reserved',           byteOffset: 44,  byteLength: 60, color: 'var(--muted)',   description: 'Rezervováno – musí být nuly' },
  { label: 'Peak Data',          byteOffset: 104, byteLength: -1, color: '#ef9a9a',        description: 'Samotná peak data – hodnoty amplitudy pro každý kanál a rámec' },
];

type LevlForm = {
  version: number;
  format: number;
  channelCount: number;
  blockSize: number;
};

@Component({
  selector: 'app-levl-detail',
  standalone: true,
  templateUrl: './levl-detail.component.html',
  styleUrls: ['./levl-detail.component.css'],
  imports: [FormsModule, ChunkHexViewerComponent],
})
export class LevlDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly levlHighlights: ChunkHighlight[] = LEVL_HIGHLIGHTS;

  protected readonly levl = computed((): LevlParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'levl' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected form: LevlForm = { version: 0, format: 0, channelCount: 0, blockSize: 0 };

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected readonly envelopeBytes = computed((): number => {
    const size = this.liveChunk()?.size ?? 0;
    return Math.max(0, size - 24);
  });

  protected readonly onEditClick = (): void => {
    const l = this.levl();
    if (!l) return;
    this.form = {
      version: l.version,
      format: l.format,
      channelCount: l.channels,
      blockSize: l.blockSize,
    };
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

    const dto: UpdateLevlDto = {
      version: this.form.version,
      format: this.form.format,
      channelCount: this.form.channelCount,
      blockSize: this.form.blockSize,
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateLevl(this.wavId(), live.id, dto)
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
