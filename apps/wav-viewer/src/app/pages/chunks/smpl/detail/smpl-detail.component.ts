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
import type { SmplParsed, UpdateSmplDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { AudioParamCardComponent } from '../../../../components/audio-param-card/audio-param-card.component';
import { ConfirmInlineComponent } from '../../../../components/confirm-inline/confirm-inline.component';
import { midiNoteToName } from '../../../../utils/midi.utils';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const LOOP_TYPE_NAMES: Record<number, string> = { 0: 'Forward', 1: 'Ping-pong', 2: 'Reverse' };

type EditLoop = {
  _id: number;
  type: number;
  start: number;
  end: number;
  fraction: number;
  playCount: number;
};

@Component({
  selector: 'app-smpl-detail',
  standalone: true,
  templateUrl: './smpl-detail.component.html',
  styleUrls: ['./smpl-detail.component.css'],
  imports: [FormsModule, AudioParamCardComponent, ConfirmInlineComponent, ChunkHexViewerComponent],
})
export class SmplDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  // Server-side state
  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly hexVersion = signal(0);

  protected readonly smplHighlights = computed<ChunkHighlight[]>(() => {
    const base: ChunkHighlight[] = [
      { label: 'ID',             byteOffset: 0,  byteLength: 4, color: 'var(--brand)',   description: '4bajtový ASCII identifikátor chunku' },
      { label: 'Size',           byteOffset: 4,  byteLength: 4, color: 'var(--success)', description: 'Velikost těla chunku v bajtech' },
      { label: 'Manufacturer',   byteOffset: 8,  byteLength: 4, color: 'var(--warning)', description: 'MIDI Manufacturer ID (uint32)' },
      { label: 'Product',        byteOffset: 12, byteLength: 4, color: 'var(--danger)',  description: 'ID produktu výrobce (uint32)' },
      { label: 'Sample Period',  byteOffset: 16, byteLength: 4, color: '#b388ff',        description: 'Perioda vzorku v nanosekundách = 1 000 000 000 / SampleRate' },
      { label: 'MIDI Unity Note',byteOffset: 20, byteLength: 4, color: '#80cbc4',        description: 'MIDI nota pro přehrání beze změny výšky (0–127)' },
      { label: 'MIDI Pitch Frac',byteOffset: 24, byteLength: 4, color: '#ffab40',        description: 'Zlomková část MIDI noty (uint32, 0x80000000 = 0.5 půltónu)' },
      { label: 'SMPTE Format',   byteOffset: 28, byteLength: 4, color: '#f48fb1',        description: 'SMPTE formát (0=none, 24, 25, 29, 30 fps)' },
      { label: 'SMPTE Offset',   byteOffset: 32, byteLength: 4, color: '#a5d6a7',        description: 'SMPTE časový offset (hours:minutes:seconds:frames packed)' },
      { label: 'Loop Count',     byteOffset: 36, byteLength: 4, color: '#ce93d8',        description: 'Počet smyček definovaných v tomto chunku (uint32)' },
      { label: 'Sampler Data',   byteOffset: 40, byteLength: 4, color: '#80deea',        description: 'Délka dodatečných sampler dat za smyčkami v bajtech' },
    ];
    const loops = this.smpl()?.loops ?? [];
    const colors = ['#ef9a9a', '#b388ff', '#80cbc4', '#ffab40', '#f48fb1', '#a5d6a7', '#ce93d8', '#80deea'];
    loops.forEach((_, i) => {
      const baseOffset = 44 + i * 24;
      const color = colors[i % colors.length];
      base.push({ label: `Loop ${i + 1}`, byteOffset: baseOffset, byteLength: 24, color, description: `Smyčka ${i + 1}: CuePoint ID (4B) + Type (4B) + Start (4B) + End (4B) + Fraction (4B) + PlayCount (4B)` });
    });
    return base;
  });

  protected readonly smpl = computed((): SmplParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'smpl' ? parsed : null;
  });

  // ── View-mode computed labels ───────────────────────────────────────────────

  protected readonly midiNoteLabel = computed((): string => {
    const s = this.smpl();
    return s ? `${s.midiUnityNote} – ${midiNoteToName(s.midiUnityNote)}` : '–';
  });

  protected readonly samplePeriodLabel = computed((): string => {
    const s = this.smpl();
    return s ? `${s.samplePeriod} ns` : '–';
  });

  protected readonly pitchFractionLabel = computed((): string => {
    const s = this.smpl();
    return s !== null ? String(s.midiPitchFraction) : '–';
  });

  protected readonly smpteFormatLabel = computed((): string => {
    const s = this.smpl();
    return s !== null ? String(s.smpteFormat) : '–';
  });

  protected readonly smpteOffsetLabel = computed((): string => {
    const s = this.smpl();
    return s !== null ? String(s.smpteOffset) : '–';
  });

  protected readonly manufacturerLabel = computed((): string => {
    const s = this.smpl();
    return s !== null ? `0x${s.manufacturer.toString(16).toUpperCase().padStart(8, '0')}` : '–';
  });

  protected readonly productLabel = computed((): string => {
    const s = this.smpl();
    return s !== null ? `0x${s.product.toString(16).toUpperCase().padStart(8, '0')}` : '–';
  });

  // ── Edit state ──────────────────────────────────────────────────────────────

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  // Form: MIDI note as signal for live preview; rest as plain mutable properties
  protected readonly formNote: WritableSignal<number> = signal(60);
  protected formPitchFraction = 0;
  protected formSamplePeriod = 22676;
  protected formSmpteFormat = 0;
  protected formSmpteOffset = 0;

  protected readonly editLoops: WritableSignal<EditLoop[]> = signal([]);
  protected readonly pendingDeleteId: WritableSignal<number | null> = signal(null);

  protected readonly formNoteName = computed((): string =>
    midiNoteToName(Math.max(0, Math.min(127, this.formNote()))),
  );

  private nextLoopId = 0;

  constructor() {
    effect(() => {
      this.liveChunk.set(this.chunk());
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  protected loopTypeLabel(type: number): string {
    return LOOP_TYPE_NAMES[type] ?? `Typ ${type}`;
  }

  // ── Edit actions ────────────────────────────────────────────────────────────

  protected readonly onEditClick = (): void => {
    const s = this.smpl();
    if (!s) return;
    this.formNote.set(s.midiUnityNote);
    this.formPitchFraction = s.midiPitchFraction;
    this.formSamplePeriod = s.samplePeriod;
    this.formSmpteFormat = s.smpteFormat;
    this.formSmpteOffset = s.smpteOffset;
    this.editLoops.set(
      s.loops.map((l) => ({
        _id: this.nextLoopId++,
        type: l.type,
        start: l.start,
        end: l.end,
        fraction: l.fraction,
        playCount: l.playCount,
      })),
    );
    this.pendingDeleteId.set(null);
    this.saveError.set(null);
    this.isEditing.set(true);
  };

  protected readonly onCancelClick = (): void => {
    this.isEditing.set(false);
    this.saveError.set(null);
    this.pendingDeleteId.set(null);
  };

  protected readonly addLoop = (): void => {
    this.editLoops.update((loops) => [
      ...loops,
      { _id: this.nextLoopId++, type: 0, start: 0, end: 0, fraction: 0, playCount: 0 },
    ]);
  };

  protected readonly updateLoop = (
    id: number,
    field: keyof Omit<EditLoop, '_id'>,
    val: number,
  ): void => {
    this.editLoops.update((loops) =>
      loops.map((l) => (l._id === id ? { ...l, [field]: val } : l)),
    );
  };

  protected readonly onDeleteRequest = (id: number): void => {
    this.pendingDeleteId.set(id);
  };

  protected readonly onDeleteConfirm = (): void => {
    const id = this.pendingDeleteId();
    if (id === null) return;
    this.editLoops.update((loops) => loops.filter((l) => l._id !== id));
    this.pendingDeleteId.set(null);
  };

  protected readonly onDeleteCancel = (): void => {
    this.pendingDeleteId.set(null);
  };

  protected readonly onSaveClick = (): void => {
    const live = this.liveChunk();
    if (!live) return;

    const dto: UpdateSmplDto = {
      midiUnityNote: this.formNote(),
      midiPitchFraction: this.formPitchFraction,
      samplePeriod: this.formSamplePeriod,
      smpteFormat: this.formSmpteFormat,
      smpteOffset: this.formSmpteOffset,
      loops: this.editLoops().map((l) => ({
        type: l.type,
        start: l.start,
        end: l.end,
        fraction: l.fraction,
        playCount: l.playCount,
      })),
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateSmpl(this.wavId(), live.id, dto)
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