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
  imports: [FormsModule, DecimalPipe],
})
export class BextDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

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