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
import type { AdtlParsed, UpdateAdtlDto, UpdateAdtlEntryDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ConfirmInlineComponent } from '../../../../components/confirm-inline/confirm-inline.component';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const ADTL_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',         byteOffset: 0,  byteLength: 4,  color: 'var(--brand)',   description: '4bajtový ASCII identifikátor chunku' },
  { label: 'Size',       byteOffset: 4,  byteLength: 4,  color: 'var(--success)', description: 'Velikost těla chunku v bajtech' },
  { label: 'List Type',  byteOffset: 8,  byteLength: 4,  color: 'var(--warning)', description: "Typ LIST chunku – 'adtl' = associated data list" },
  { label: 'Sub-chunks', byteOffset: 12, byteLength: -1, color: '#b388ff',        description: 'Sub-chunky: labl (label), note (poznámka), ltxt (text s délkou) – každý s vlastní hlavičkou' },
];

type EditRow = {
  _id: number;
  cuePointId: number;
  type: 'labl' | 'note' | 'ltxt';
  text: string;
  pendingDelete: boolean;
};

@Component({
  selector: 'app-adtl-detail',
  standalone: true,
  templateUrl: './adtl-detail.component.html',
  styleUrls: ['./adtl-detail.component.css'],
  imports: [FormsModule, ConfirmInlineComponent, ChunkHexViewerComponent],
})
export class AdtlDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly adtlHighlights: ChunkHighlight[] = ADTL_HIGHLIGHTS;
  protected readonly hexVersion = signal(0);

  protected readonly adtl = computed((): AdtlParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'adtl' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected readonly rows: WritableSignal<EditRow[]> = signal([]);
  private _rowIdCounter = 0;

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  private adtlToRows(a: AdtlParsed): EditRow[] {
    return a.entries.map((e) => ({
      _id: this._rowIdCounter++,
      cuePointId: e.cuePointId,
      type: (e.id === 'labl' || e.id === 'note' || e.id === 'ltxt') ? e.id : 'labl',
      text: e.text ?? '',
      pendingDelete: false,
    }));
  }

  protected readonly onEditClick = (): void => {
    const a = this.adtl();
    this.rows.set(a ? this.adtlToRows(a) : []);
    this.saveError.set(null);
    this.isEditing.set(true);
  };

  protected readonly onCancelClick = (): void => {
    this.isEditing.set(false);
    this.saveError.set(null);
  };

  protected readonly onAddRow = (): void => {
    this.rows.update((rs) => [
      ...rs,
      { _id: this._rowIdCounter++, cuePointId: 0, type: 'labl', text: '', pendingDelete: false },
    ]);
  };

  protected readonly onDeleteRequest = (id: number): void => {
    this.rows.update((rs) => rs.map((r) => r._id === id ? { ...r, pendingDelete: true } : r));
  };

  protected readonly onDeleteConfirm = (id: number): void => {
    this.rows.update((rs) => rs.filter((r) => r._id !== id));
  };

  protected readonly onDeleteCancel = (id: number): void => {
    this.rows.update((rs) => rs.map((r) => r._id === id ? { ...r, pendingDelete: false } : r));
  };

  protected readonly onSaveClick = (): void => {
    const live = this.liveChunk();
    if (!live) return;

    const entries: UpdateAdtlEntryDto[] = this.rows().map((r) => ({
      cuePointId: r.cuePointId,
      type: r.type,
      text: r.text,
    }));

    const dto: UpdateAdtlDto = { entries };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateAdtl(this.wavId(), live.id, dto)
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