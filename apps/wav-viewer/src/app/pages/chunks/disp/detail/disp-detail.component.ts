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
import type { DispParsed, UpdateDispDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';

const CF_TYPE_NAMES: Record<number, string> = {
  1: 'CF_TEXT',
  13: 'CF_UNICODETEXT',
};

@Component({
  selector: 'app-disp-detail',
  standalone: true,
  templateUrl: './disp-detail.component.html',
  styleUrls: ['./disp-detail.component.css'],
  imports: [FormsModule],
})
export class DispDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly disp = computed((): DispParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'DISP' ? parsed : null;
  });

  protected readonly cfTypeName = computed((): string => {
    const d = this.disp();
    if (!d) return '';
    return CF_TYPE_NAMES[d.cfType] ? `${CF_TYPE_NAMES[d.cfType]} (${d.cfType})` : `CF type ${d.cfType}`;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected formText = '';

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  protected readonly onEditClick = (): void => {
    const d = this.disp();
    if (!d) return;
    this.formText = d.text;
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

    const dto: UpdateDispDto = { text: this.formText };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateDisp(this.wavId(), live.id, dto)
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