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
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const CART_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',             byteOffset: 0,    byteLength: 4,    color: 'var(--brand)',   description: '4-byte ASCII chunk identifier' },
  { label: 'Size',           byteOffset: 4,    byteLength: 4,    color: 'var(--success)', description: 'Chunk body size in bytes' },
  { label: 'Version',        byteOffset: 8,    byteLength: 4,    color: 'var(--warning)', description: "Cart chunk version (ASCII, e.g. '0101')" },
  { label: 'Title',          byteOffset: 12,   byteLength: 64,   color: 'var(--danger)',  description: 'Recording title (64 ASCII characters)' },
  { label: 'Artist',         byteOffset: 76,   byteLength: 64,   color: '#b388ff',        description: 'Artist (64 ASCII characters)' },
  { label: 'Cut ID',         byteOffset: 140,  byteLength: 64,   color: '#80cbc4',        description: 'Cut identifier (64 ASCII characters)' },
  { label: 'Client ID',      byteOffset: 204,  byteLength: 64,   color: '#ffab40',        description: 'Client identifier (64 ASCII characters)' },
  { label: 'Category',       byteOffset: 268,  byteLength: 64,   color: '#f48fb1',        description: 'Recording category (64 ASCII characters)' },
  { label: 'Classification', byteOffset: 332,  byteLength: 64,   color: '#a5d6a7',        description: 'Classification (64 ASCII characters)' },
  { label: 'Out Cue',        byteOffset: 396,  byteLength: 64,   color: '#ce93d8',        description: 'Out cue text (64 ASCII characters)' },
  { label: 'Start Date',     byteOffset: 460,  byteLength: 10,   color: '#80deea',        description: 'Start validity date (YYYY-MM-DD)' },
  { label: 'Start Time',     byteOffset: 470,  byteLength: 8,    color: '#ef9a9a',        description: 'Start validity time (HH:MM:SS)' },
  { label: 'End Date',       byteOffset: 478,  byteLength: 10,   color: '#ffe082',        description: 'End validity date (YYYY-MM-DD)' },
  { label: 'End Time',       byteOffset: 488,  byteLength: 8,    color: '#a5d6a7',        description: 'End validity time (HH:MM:SS)' },
  { label: 'Producer App',   byteOffset: 496,  byteLength: 64,   color: '#90caf9',        description: 'Name of the application that created the file (64 characters)' },
  { label: 'Producer Ver',   byteOffset: 560,  byteLength: 64,   color: '#b0bec5',        description: 'Application version (64 characters)' },
  { label: 'User Def',       byteOffset: 624,  byteLength: 64,   color: '#bcaaa4',        description: 'User-defined field (64 characters)' },
  { label: 'Level Ref',      byteOffset: 688,  byteLength: 4,    color: 'var(--warning)', description: 'Reference level in dB × 100 (int32)' },
  { label: 'Post Timer',     byteOffset: 692,  byteLength: 128,  color: '#b388ff',        description: '8 post-timer records of 16 bytes each (usage 4B + value 4B × 2)' },
  { label: 'Reserved',       byteOffset: 820,  byteLength: 276,  color: 'var(--muted)',   description: 'Reserved fields' },
  { label: 'URL',            byteOffset: 1096, byteLength: 1024, color: '#80cbc4',        description: 'URL link (1024 ASCII characters)' },
  { label: 'Tag Text',       byteOffset: 2120, byteLength: -1,   color: '#ffab40',        description: 'Free text with tags (variable length)' },
];

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
  imports: [FormsModule, ChunkHexViewerComponent],
})
export class CartDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly cartHighlights: ChunkHighlight[] = CART_HIGHLIGHTS;
  protected readonly hexVersion = signal(0);

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
