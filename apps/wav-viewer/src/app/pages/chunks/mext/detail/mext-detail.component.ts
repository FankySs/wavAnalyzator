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
import type { MextParsed, UpdateMextDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const MEXT_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',                byteOffset: 0,  byteLength: 4, color: 'var(--brand)',   description: '4-byte ASCII chunk identifier' },
  { label: 'Size',              byteOffset: 4,  byteLength: 4, color: 'var(--success)', description: 'Chunk body size in bytes' },
  { label: 'Sound Information', byteOffset: 8,  byteLength: 2, color: 'var(--warning)', description: 'Bit flags – homogeneous data, padding used, etc. (uint16 bitfield)' },
  { label: 'Frame Size',        byteOffset: 10, byteLength: 2, color: 'var(--danger)',  description: 'MP2 frame size in bytes (uint16)' },
  { label: 'Ancillary Length',  byteOffset: 12, byteLength: 2, color: 'var(--highlight-10)',        description: 'Ancillary data length in bits (uint16)' },
  { label: 'Ancillary Data',    byteOffset: 14, byteLength: 2, color: 'var(--highlight-2)',        description: 'Ancillary data definition (uint16 bitfield)' },
];

type MextForm = {
  soundInformation: number;
  frameCount: number;
  ancillaryDataLength: number;
  ancillaryDataDef: number;
};

@Component({
  selector: 'app-mext-detail',
  standalone: true,
  templateUrl: './mext-detail.component.html',
  styleUrls: ['./mext-detail.component.css'],
  imports: [FormsModule, ChunkHexViewerComponent],
})
export class MextDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly mextHighlights: ChunkHighlight[] = MEXT_HIGHLIGHTS;
  protected readonly hexVersion = signal(0);

  protected readonly mext = computed((): MextParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'mext' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected form: MextForm = { soundInformation: 0, frameCount: 0, ancillaryDataLength: 0, ancillaryDataDef: 0 };

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected readonly toHex = (n: number): string => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`;

  protected readonly onEditClick = (): void => {
    const m = this.mext();
    if (!m) return;
    this.form = {
      soundInformation: m.soundInformation,
      frameCount: m.frameCount,
      ancillaryDataLength: m.ancillaryDataLength,
      ancillaryDataDef: m.ancillaryDataDef,
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

    const dto: UpdateMextDto = {
      soundInformation: this.form.soundInformation,
      frameCount: this.form.frameCount,
      ancillaryDataLength: this.form.ancillaryDataLength,
      ancillaryDataDef: this.form.ancillaryDataDef,
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateMext(this.wavId(), live.id, dto)
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
