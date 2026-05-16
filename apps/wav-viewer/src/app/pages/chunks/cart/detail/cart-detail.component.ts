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
  { label: 'ID',             byteOffset: 0,    byteLength: 4,    color: 'var(--brand)',   description: '4bajtový ASCII identifikátor chunku' },
  { label: 'Size',           byteOffset: 4,    byteLength: 4,    color: 'var(--success)', description: 'Velikost těla chunku v bajtech' },
  { label: 'Version',        byteOffset: 8,    byteLength: 4,    color: 'var(--warning)', description: "Verze cart chunku (ASCII, např. '0101')" },
  { label: 'Title',          byteOffset: 12,   byteLength: 64,   color: 'var(--danger)',  description: 'Název nahrávky (64 znaků ASCII)' },
  { label: 'Artist',         byteOffset: 76,   byteLength: 64,   color: '#b388ff',        description: 'Interpret (64 znaků ASCII)' },
  { label: 'Cut ID',         byteOffset: 140,  byteLength: 64,   color: '#80cbc4',        description: 'ID položky (64 znaků ASCII)' },
  { label: 'Client ID',      byteOffset: 204,  byteLength: 64,   color: '#ffab40',        description: 'ID klienta (64 znaků ASCII)' },
  { label: 'Category',       byteOffset: 268,  byteLength: 64,   color: '#f48fb1',        description: 'Kategorie nahrávky (64 znaků ASCII)' },
  { label: 'Classification', byteOffset: 332,  byteLength: 64,   color: '#a5d6a7',        description: 'Klasifikace (64 znaků ASCII)' },
  { label: 'Out Cue',        byteOffset: 396,  byteLength: 64,   color: '#ce93d8',        description: 'Out cue text (64 znaků ASCII)' },
  { label: 'Start Date',     byteOffset: 460,  byteLength: 10,   color: '#80deea',        description: 'Datum začátku platnosti (YYYY-MM-DD)' },
  { label: 'Start Time',     byteOffset: 470,  byteLength: 8,    color: '#ef9a9a',        description: 'Čas začátku platnosti (HH:MM:SS)' },
  { label: 'End Date',       byteOffset: 478,  byteLength: 10,   color: '#ffe082',        description: 'Datum konce platnosti (YYYY-MM-DD)' },
  { label: 'End Time',       byteOffset: 488,  byteLength: 8,    color: '#a5d6a7',        description: 'Čas konce platnosti (HH:MM:SS)' },
  { label: 'Producer App',   byteOffset: 496,  byteLength: 64,   color: '#90caf9',        description: 'Název aplikace která soubor vytvořila (64 znaků)' },
  { label: 'Producer Ver',   byteOffset: 560,  byteLength: 64,   color: '#b0bec5',        description: 'Verze aplikace (64 znaků)' },
  { label: 'User Def',       byteOffset: 624,  byteLength: 64,   color: '#bcaaa4',        description: 'Uživatelsky definované pole (64 znaků)' },
  { label: 'Level Ref',      byteOffset: 688,  byteLength: 4,    color: 'var(--warning)', description: 'Referenční úroveň v dB × 100 (int32)' },
  { label: 'Post Timer',     byteOffset: 692,  byteLength: 128,  color: '#b388ff',        description: '8 post-timer záznamů po 16 bajtech (usage 4B + value 4B × 2)' },
  { label: 'Reserved',       byteOffset: 820,  byteLength: 276,  color: 'var(--muted)',   description: 'Rezervovaná pole' },
  { label: 'URL',            byteOffset: 1096, byteLength: 1024, color: '#80cbc4',        description: 'URL odkaz (1024 znaků ASCII)' },
  { label: 'Tag Text',       byteOffset: 2120, byteLength: -1,   color: '#ffab40',        description: 'Volný text s tagy (proměnná délka)' },
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
