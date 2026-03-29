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
import type { InstParsed, UpdateInstDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { AudioParamCardComponent } from '../../../../components/audio-param-card/audio-param-card.component';
import { midiNoteToName } from '../../../../utils/midi.utils';

@Component({
  selector: 'app-inst-detail',
  standalone: true,
  templateUrl: './inst-detail.component.html',
  styleUrls: ['./inst-detail.component.css'],
  imports: [FormsModule, AudioParamCardComponent],
})
export class InstDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  // Server-side state
  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly inst = computed((): InstParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'inst' ? parsed : null;
  });

  // ── View-mode computed labels ───────────────────────────────────────────────

  protected readonly unshiftedNoteLabel = computed((): string => {
    const s = this.inst();
    return s ? `${s.unshiftedNote} – ${midiNoteToName(s.unshiftedNote)}` : '–';
  });

  protected readonly fineTuneLabel = computed((): string => {
    const s = this.inst();
    return s !== null ? `${s.fineTune} centů` : '–';
  });

  protected readonly gainLabel = computed((): string => {
    const s = this.inst();
    return s !== null ? `${s.gain} dB` : '–';
  });

  protected readonly lowNoteLabel = computed((): string => {
    const s = this.inst();
    return s ? `${s.lowNote} – ${midiNoteToName(s.lowNote)}` : '–';
  });

  protected readonly highNoteLabel = computed((): string => {
    const s = this.inst();
    return s ? `${s.highNote} – ${midiNoteToName(s.highNote)}` : '–';
  });

  protected readonly lowVelocityLabel = computed((): string => {
    const s = this.inst();
    return s !== null ? String(s.lowVelocity) : '–';
  });

  protected readonly highVelocityLabel = computed((): string => {
    const s = this.inst();
    return s !== null ? String(s.highVelocity) : '–';
  });

  // ── MIDI range bar ──────────────────────────────────────────────────────────

  protected readonly rangeLeft = computed((): string => {
    const s = this.inst();
    return s ? `${(s.lowNote / 127) * 100}%` : '0%';
  });

  protected readonly rangeWidth = computed((): string => {
    const s = this.inst();
    return s ? `${((s.highNote - s.lowNote) / 127) * 100}%` : '100%';
  });

  protected readonly rangeLowLabel = computed((): string => {
    const s = this.inst();
    return s ? midiNoteToName(s.lowNote) : '';
  });

  protected readonly rangeHighLabel = computed((): string => {
    const s = this.inst();
    return s ? midiNoteToName(s.highNote) : '';
  });

  // ── Edit state ──────────────────────────────────────────────────────────────

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  // Note fields as signals for live preview; numeric fields as plain properties
  protected readonly formUnshifted: WritableSignal<number> = signal(60);
  protected readonly formLowNote: WritableSignal<number> = signal(0);
  protected readonly formHighNote: WritableSignal<number> = signal(127);
  protected formFineTune = 0;
  protected formGain = 0;
  protected formLowVelocity = 1;
  protected formHighVelocity = 127;

  protected readonly formUnshiftedName = computed((): string =>
    midiNoteToName(Math.max(0, Math.min(127, this.formUnshifted()))),
  );

  protected readonly formLowNoteName = computed((): string =>
    midiNoteToName(Math.max(0, Math.min(127, this.formLowNote()))),
  );

  protected readonly formHighNoteName = computed((): string =>
    midiNoteToName(Math.max(0, Math.min(127, this.formHighNote()))),
  );

  constructor() {
    effect(() => {
      this.liveChunk.set(this.chunk());
    });
  }

  // ── Edit actions ────────────────────────────────────────────────────────────

  protected readonly onEditClick = (): void => {
    const s = this.inst();
    if (!s) return;
    this.formUnshifted.set(s.unshiftedNote);
    this.formFineTune = s.fineTune;
    this.formGain = s.gain;
    this.formLowNote.set(s.lowNote);
    this.formHighNote.set(s.highNote);
    this.formLowVelocity = s.lowVelocity;
    this.formHighVelocity = s.highVelocity;
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

    if (this.formLowNote() > this.formHighNote()) {
      this.saveError.set('Nejnižší nota musí být ≤ nejvyšší notě.');
      return;
    }
    if (this.formLowVelocity > this.formHighVelocity) {
      this.saveError.set('Nejnižší velocity musí být ≤ nejvyšší velocity.');
      return;
    }

    const dto: UpdateInstDto = {
      unshiftedNote: this.formUnshifted(),
      fineTune: this.formFineTune,
      gain: this.formGain,
      lowNote: this.formLowNote(),
      highNote: this.formHighNote(),
      lowVelocity: this.formLowVelocity,
      highVelocity: this.formHighVelocity,
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateInst(this.wavId(), live.id, dto)
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