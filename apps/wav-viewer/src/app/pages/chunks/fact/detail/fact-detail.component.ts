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

@Component({
  selector: 'app-fact-detail',
  standalone: true,
  templateUrl: './fact-detail.component.html',
  styleUrls: ['./fact-detail.component.css'],
  imports: [FormsModule, AudioParamCardComponent],
})
export class FactDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

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