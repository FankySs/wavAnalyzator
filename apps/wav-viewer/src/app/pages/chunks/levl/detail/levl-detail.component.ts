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
  imports: [FormsModule],
})
export class LevlDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

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
