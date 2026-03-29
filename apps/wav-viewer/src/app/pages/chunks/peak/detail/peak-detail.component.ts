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
import type { PeakParsed, UpdatePeakDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { samplesToTime } from '../../../../utils/time.utils';

@Component({
  selector: 'app-peak-detail',
  standalone: true,
  templateUrl: './peak-detail.component.html',
  styleUrls: ['./peak-detail.component.css'],
  imports: [FormsModule],
})
export class PeakDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();
  readonly sampleRate = input<number | undefined>(undefined);

  protected readonly resolvedSampleRate = computed(() => this.sampleRate() ?? 44100);

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly peak = computed((): PeakParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'peak' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected readonly formChannels: WritableSignal<Array<{ value: number; position: number }>> = signal([]);

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected peakBarClass(value: number): string {
    if (value < 0.7) return 'bar-green';
    if (value < 0.9) return 'bar-amber';
    return 'bar-red';
  }

  protected peakBarWidth(value: number): string {
    return `${Math.min(100, value * 100).toFixed(1)}%`;
  }

  protected peakLabel(value: number): string {
    return `${value.toFixed(3)} (${(value * 100).toFixed(1)}%)`;
  }

  protected positionTime(position: number): string {
    return samplesToTime(position, this.resolvedSampleRate());
  }

  protected readonly onEditClick = (): void => {
    const p = this.peak();
    if (!p) return;
    this.formChannels.set(p.channels.map((c) => ({ value: c.value, position: c.position })));
    this.saveError.set(null);
    this.isEditing.set(true);
  };

  protected readonly onCancelClick = (): void => {
    this.isEditing.set(false);
    this.saveError.set(null);
  };

  protected readonly updateChannel = (
    index: number,
    field: 'value' | 'position',
    val: number,
  ): void => {
    this.formChannels.update((chs) =>
      chs.map((c, i) => (i === index ? { ...c, [field]: val } : c)),
    );
  };

  protected readonly onSaveClick = (): void => {
    const live = this.liveChunk();
    if (!live) return;

    const dto: UpdatePeakDto = { channels: this.formChannels() };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updatePeak(this.wavId(), live.id, dto)
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