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
import type { UmidParsed, UpdateUmidDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';

const UMID_HEX_RE = /^[0-9A-Fa-f]{128}$/;

@Component({
  selector: 'app-umid-detail',
  standalone: true,
  templateUrl: './umid-detail.component.html',
  styleUrls: ['./umid-detail.component.css'],
  imports: [FormsModule],
})
export class UmidDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly umid = computed((): UmidParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'umid' ? parsed : null;
  });

  /** Split 128-char hex into groups of 8 separated by spaces */
  protected readonly formattedHex = computed((): string => {
    const u = this.umid();
    if (!u) return '';
    return u.umidHex.toUpperCase().match(/.{1,8}/g)?.join(' ') ?? u.umidHex.toUpperCase();
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);
  protected readonly validationError: WritableSignal<string | null> = signal(null);

  protected formUmid = '';

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected readonly onEditClick = (): void => {
    const u = this.umid();
    if (!u) return;
    this.formUmid = u.umidHex.toUpperCase();
    this.validationError.set(null);
    this.saveError.set(null);
    this.isEditing.set(true);
  };

  protected readonly onCancelClick = (): void => {
    this.isEditing.set(false);
    this.saveError.set(null);
    this.validationError.set(null);
  };

  protected readonly onFormInput = (): void => {
    if (this.formUmid && !UMID_HEX_RE.test(this.formUmid)) {
      this.validationError.set('UMID musí obsahovat přesně 128 hex znaků (0-9, A-F).');
    } else {
      this.validationError.set(null);
    }
  };

  protected readonly onSaveClick = (): void => {
    if (!UMID_HEX_RE.test(this.formUmid)) {
      this.validationError.set('UMID musí obsahovat přesně 128 hex znaků (0-9, A-F).');
      return;
    }

    const live = this.liveChunk();
    if (!live) return;

    const dto: UpdateUmidDto = { umid: this.formUmid };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateUmid(this.wavId(), live.id, dto)
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