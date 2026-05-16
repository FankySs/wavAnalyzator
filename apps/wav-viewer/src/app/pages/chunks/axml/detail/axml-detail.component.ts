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
import type { AxmlParsed, UpdateAxmlDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const AXML_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',       byteOffset: 0, byteLength: 4,  color: 'var(--brand)',   description: '4-byte ASCII chunk identifier' },
  { label: 'Size',     byteOffset: 4, byteLength: 4,  color: 'var(--success)', description: 'Chunk body size in bytes' },
  { label: 'XML Data', byteOffset: 8, byteLength: -1, color: 'var(--warning)', description: 'XML metadata in UTF-8 format (variable length)' },
];

@Component({
  selector: 'app-axml-detail',
  standalone: true,
  templateUrl: './axml-detail.component.html',
  styleUrls: ['./axml-detail.component.css'],
  imports: [FormsModule, ChunkHexViewerComponent],
})
export class AxmlDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly axmlHighlights: ChunkHighlight[] = AXML_HIGHLIGHTS;
  protected readonly hexVersion = signal(0);

  protected readonly axml = computed((): AxmlParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'axml' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected formXml = '';

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected readonly onEditClick = (): void => {
    const a = this.axml();
    this.formXml = a?.xml ?? '';
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

    const dto: UpdateAxmlDto = { xml: this.formXml };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateAxml(this.wavId(), live.id, dto)
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
