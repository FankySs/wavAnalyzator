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
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { BextParsed, UpdateBextDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const BEXT_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',               byteOffset: 0,   byteLength: 4,   color: 'var(--brand)',   description: '4-byte ASCII chunk identifier' },
  { label: 'Size',             byteOffset: 4,   byteLength: 4,   color: 'var(--success)', description: 'Chunk body size in bytes' },
  { label: 'Description',      byteOffset: 8,   byteLength: 256, color: 'var(--warning)', description: 'Text description of the recording (256 characters, null-terminated ASCII)' },
  { label: 'Originator',       byteOffset: 264, byteLength: 32,  color: 'var(--danger)',  description: 'Name of the device or software that created the recording (32 characters)' },
  { label: 'Originator Ref',   byteOffset: 296, byteLength: 32,  color: '#b388ff',        description: 'Unique originator reference (32 characters)' },
  { label: 'Origination Date', byteOffset: 328, byteLength: 10,  color: '#80cbc4',        description: 'Creation date in YYYY-MM-DD format (10 ASCII characters)' },
  { label: 'Origination Time', byteOffset: 338, byteLength: 8,   color: '#ffab40',        description: 'Creation time in HH-MM-SS format (8 ASCII characters)' },
  { label: 'Time Reference',   byteOffset: 346, byteLength: 8,   color: '#f48fb1',        description: 'Time reference from midnight in samples (uint64, little-endian)' },
  { label: 'Version',          byteOffset: 354, byteLength: 2,   color: '#a5d6a7',        description: 'BWF standard version (uint16)' },
  { label: 'UMID',             byteOffset: 356, byteLength: 64,  color: '#ce93d8',        description: 'Unique Material Identifier per SMPTE 330M (64 bytes)' },
  { label: 'Loudness Value',   byteOffset: 420, byteLength: 2,   color: '#80deea',        description: 'Integrated loudness in LUFS × 100 (int16)' },
  { label: 'Loudness Range',   byteOffset: 422, byteLength: 2,   color: '#ef9a9a',        description: 'Loudness range LRA × 100 (uint16)' },
  { label: 'Max True Peak',    byteOffset: 424, byteLength: 2,   color: '#ffe082',        description: 'Maximum True Peak Level × 100 (int16)' },
  { label: 'Max Momentary',    byteOffset: 426, byteLength: 2,   color: '#a5d6a7',        description: 'Maximum momentary loudness × 100 (int16)' },
  { label: 'Max Short Term',   byteOffset: 428, byteLength: 2,   color: '#90caf9',        description: 'Maximum short-term loudness × 100 (int16)' },
  { label: 'Reserved',         byteOffset: 430, byteLength: 180, color: 'var(--muted)',   description: 'Reserved – must be zeros (180 bytes)' },
  { label: 'Coding History',   byteOffset: 610, byteLength: -1,  color: '#b0bec5',        description: 'Coding history – free text describing signal processing' },
];

type BextForm = {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string;
  originationTime: string;
  timeReference: number;
  codingHistory: string;
};

@Component({
  selector: 'app-bext-detail',
  standalone: true,
  templateUrl: './bext-detail.component.html',
  styleUrls: ['./bext-detail.component.css'],
  imports: [FormsModule, DecimalPipe, ChunkHexViewerComponent],
})
export class BextDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly bextHighlights: ChunkHighlight[] = BEXT_HIGHLIGHTS;
  protected readonly hexVersion = signal(0);

  protected readonly bext = computed((): BextParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'bext' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected form: BextForm = this.emptyForm();

  constructor() {
    effect(() => {
      const c = this.chunk();
      this.liveChunk.set(c);
    });
  }

  private emptyForm(): BextForm {
    return {
      description: '',
      originator: '',
      originatorReference: '',
      originationDate: new Date().toISOString().slice(0, 10),
      originationTime: '00:00:00',
      timeReference: 0,
      codingHistory: '',
    };
  }

  private formFromBext(b: BextParsed): BextForm {
    return {
      description: b.description,
      originator: b.originator,
      originatorReference: b.originatorReference,
      originationDate: b.originationDate,
      originationTime: b.originationTime,
      timeReference: b.timeReferenceLow + b.timeReferenceHigh * 4294967296,
      codingHistory: b.codingHistory ?? '',
    };
  }

  protected readonly onEditClick = (): void => {
    const b = this.bext();
    this.form = b ? this.formFromBext(b) : this.emptyForm();
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

    const dto: UpdateBextDto = {
      description: this.form.description,
      originator: this.form.originator,
      originatorReference: this.form.originatorReference,
      originationDate: this.form.originationDate,
      originationTime: this.form.originationTime,
      timeReference: this.form.timeReference,
      codingHistory: this.form.codingHistory,
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateBext(this.wavId(), live.id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.liveChunk.set(updated);
          this.hexVersion.update(v => v + 1);
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