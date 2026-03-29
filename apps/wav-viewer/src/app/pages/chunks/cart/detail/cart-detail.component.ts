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
import type { CartParsed, UpdateCartDto, WavChunkDetailDto } from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';

type CartForm = {
  title: string;
  artist: string;
  cutId: string;
  clientId: string;
  category: string;
  classification: string;
  outCue: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  producerAppId: string;
  producerAppVersion: string;
  userDef: string;
  url: string;
  tag: string;
};

@Component({
  selector: 'app-cart-detail',
  standalone: true,
  templateUrl: './cart-detail.component.html',
  styleUrls: ['./cart-detail.component.css'],
  imports: [FormsModule],
})
export class CartDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly cart = computed((): CartParsed | null => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'cart' ? parsed : null;
  });

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  protected form: CartForm = this.emptyForm();

  constructor() {
    effect(() => { this.liveChunk.set(this.chunk()); });
  }

  private emptyForm(): CartForm {
    return {
      title: '', artist: '', cutId: '', clientId: '',
      category: '', classification: '', outCue: '',
      startDate: '', startTime: '', endDate: '', endTime: '',
      producerAppId: '', producerAppVersion: '', userDef: '',
      url: '', tag: '',
    };
  }

  private formFromCart(c: CartParsed): CartForm {
    return {
      title: c.title,
      artist: c.artist,
      cutId: c.cutId,
      clientId: c.clientId,
      category: c.category,
      classification: c.classification,
      outCue: c.outCue,
      startDate: c.startDate,
      startTime: c.startTime,
      endDate: c.endDate,
      endTime: c.endTime,
      producerAppId: c.producerAppId,
      producerAppVersion: c.producerAppVersion,
      userDef: c.userDef,
      url: c.url,
      tag: c.tag ?? '',
    };
  }

  protected readonly onEditClick = (): void => {
    const c = this.cart();
    this.form = c ? this.formFromCart(c) : this.emptyForm();
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

    const dto: UpdateCartDto = {
      title: this.form.title,
      artist: this.form.artist,
      cutId: this.form.cutId,
      clientId: this.form.clientId,
      category: this.form.category,
      classification: this.form.classification,
      outCue: this.form.outCue,
      startDate: this.form.startDate,
      startTime: this.form.startTime,
      endDate: this.form.endDate,
      endTime: this.form.endTime,
      producerAppId: this.form.producerAppId,
      producerAppVersion: this.form.producerAppVersion,
      userDef: this.form.userDef,
      url: this.form.url,
      tag: this.form.tag,
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateCart(this.wavId(), live.id, dto)
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
