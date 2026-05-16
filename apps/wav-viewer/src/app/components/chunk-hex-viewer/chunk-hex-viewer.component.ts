import {
  Component,
  DestroyRef,
  HostListener,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WavApiService } from '../../services/wav-api.service';

export interface ChunkHighlight {
  label: string;
  byteOffset: number;
  byteLength: number;
  color: string;
  description?: string;
}

type HexCell = {
  index: number;
  hex: string;
  style: Record<string, string>;
};

type HexRow = {
  offset: string;
  cells: HexCell[];
};

@Component({
  selector: 'app-chunk-hex-viewer',
  standalone: true,
  templateUrl: './chunk-hex-viewer.component.html',
  styleUrls: ['./chunk-hex-viewer.component.css'],
})
export class ChunkHexViewerComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly wavId = input.required<string>();
  readonly chunkId = input.required<string>();
  readonly chunkFourCC = input.required<string>();
  readonly chunkSize = input.required<number>();
  readonly highlights = input<ChunkHighlight[]>([]);
  readonly activeHighlight = input<string | null>(null);
  readonly reloadOn = input<number>(0);

  readonly hoveredByte = output<number | null>();

  protected readonly bytes: WritableSignal<Uint8Array | null> = signal(null);
  protected readonly isLoading: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string | null> = signal(null);
  protected readonly isExpanded: WritableSignal<boolean> = signal(false);

  private readonly internalHighlight: WritableSignal<string | null> = signal(null);
  protected readonly lockedHighlight: WritableSignal<string | null> = signal(null);

  protected readonly effectiveActive = computed((): string | null =>
    this.internalHighlight() ?? this.lockedHighlight() ?? this.activeHighlight() ?? null,
  );

  protected readonly visibleHighlights = computed((): ChunkHighlight[] => {
    const bytes = this.bytes();
    if (!bytes) return [];
    return this.highlights().filter(h => h.byteOffset < bytes.length);
  });

  private readonly hlMap = computed((): Map<number, ChunkHighlight> => {
    const map = new Map<number, ChunkHighlight>();
    const bytesLen = this.bytes()?.length ?? 0;
    for (const h of this.visibleHighlights()) {
      const end = h.byteLength === -1 ? bytesLen : h.byteOffset + h.byteLength;
      for (let i = h.byteOffset; i < end; i++) {
        map.set(i, h);
      }
    }
    return map;
  });

  protected readonly rows = computed((): HexRow[] => {
    const bytes = this.bytes();
    if (!bytes) return [];

    const active = this.effectiveActive();
    const locked = this.lockedHighlight();
    const hovering = this.internalHighlight();
    const hlMap = this.hlMap();

    const result: HexRow[] = [];
    for (let rowStart = 0; rowStart < bytes.length; rowStart += 16) {
      const cells: HexCell[] = [];

      for (let col = 0; col < 16; col++) {
        const idx = rowStart + col;
        if (idx >= bytes.length) {
          cells.push({ index: -1, hex: '', style: {} });
          continue;
        }
        const byte = bytes[idx];
        const hl = hlMap.get(idx);
        const isActive = hl !== undefined && hl.label === active;
        let style: Record<string, string> = {};
        if (hl && isActive) {
          const opacity = hl.label === locked && !hovering ? '55%' : '40%';
          style = { 'background-color': `color-mix(in srgb, ${hl.color} ${opacity}, transparent)` };
        }
        cells.push({ index: idx, hex: byte.toString(16).padStart(2, '0').toUpperCase(), style });
      }

      result.push({ offset: rowStart.toString(16).toUpperCase().padStart(4, '0'), cells });
    }
    return result;
  });

  protected readonly activeByteRange = computed((): string => {
    const active = this.effectiveActive();
    if (!active) return '';
    const hl = this.visibleHighlights().find((h) => h.label === active);
    if (!hl) return '';
    const start = `0x${hl.byteOffset.toString(16).toUpperCase().padStart(2, '0')}`;
    const bytesLen = this.bytes()?.length ?? 0;
    const endByte = hl.byteLength === -1 ? bytesLen - 1 : hl.byteOffset + hl.byteLength - 1;
    const end = `0x${endByte.toString(16).toUpperCase().padStart(2, '0')}`;
    return `${start}–${end}`;
  });

  protected readonly activeDescription = computed((): string => {
    const active = this.effectiveActive();
    if (!active) return '';
    return this.visibleHighlights().find((h) => h.label === active)?.description ?? '';
  });

  protected readonly colHeaders = Array.from({ length: 16 }, (_, i) =>
    i.toString(16).toUpperCase().padStart(2, '0'),
  );

  constructor() {
    effect(() => {
      const wavId = this.wavId();
      const chunkId = this.chunkId();
      this.reloadOn();
      this.loadRawData(wavId, chunkId);
    });
  }

  private loadRawData(wavId: string, chunkId: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.bytes.set(null);

    this.wavApiService
      .getChunkRaw(wavId, chunkId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (buffer) => {
          this.bytes.set(new Uint8Array(buffer));
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          const isAudioErr = err.message.includes('Audio data chunk');
          this.error.set(isAudioErr ? 'Audio data cannot be displayed.' : err.message);
          this.isLoading.set(false);
        },
      });
  }

  protected readonly onByteEnter = (index: number): void => {
    if (index >= 0) {
      this.hoveredByte.emit(index);
      const hl = this.hlMap().get(index);
      this.internalHighlight.set(hl?.label ?? null);
    }
  };

  protected readonly onByteLeave = (): void => {
    this.hoveredByte.emit(null);
    this.internalHighlight.set(null);
  };

  protected readonly onByteClick = (index: number): void => {
    if (index < 0) return;
    const hl = this.hlMap().get(index);
    const label = hl?.label ?? null;
    this.lockedHighlight.set(this.lockedHighlight() === label ? null : label);
  };

  protected readonly onChipEnter = (label: string): void => {
    this.internalHighlight.set(label);
  };

  protected readonly onChipLeave = (): void => {
    this.internalHighlight.set(null);
  };

  protected readonly onChipClick = (label: string): void => {
    this.lockedHighlight.set(this.lockedHighlight() === label ? null : label);
  };

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.hex-grid') && !target.closest('.hex-legend')) {
      this.lockedHighlight.set(null);
    }
  }
}