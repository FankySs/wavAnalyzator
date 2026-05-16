import { Component, computed, input, signal } from '@angular/core';
import type { WavChunkDetailDto, FmtParsed } from '@shared-types';
import { AudioParamCardComponent } from '../../../../components/audio-param-card/audio-param-card.component';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const FMT_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',           byteOffset: 0,  byteLength: 4, color: 'var(--brand)' },
  { label: 'Size',         byteOffset: 4,  byteLength: 4, color: 'var(--success)' },
  { label: 'Audio Format', byteOffset: 8,  byteLength: 2, color: 'var(--warning)' },
  { label: 'Channels',     byteOffset: 10, byteLength: 2, color: 'var(--danger)' },
  { label: 'Sample Rate',  byteOffset: 12, byteLength: 4, color: '#b388ff' },
  { label: 'Byte Rate',    byteOffset: 16, byteLength: 4, color: '#80cbc4' },
  { label: 'Block Align',  byteOffset: 20, byteLength: 2, color: '#ffab40' },
  { label: 'Bit Depth',    byteOffset: 22, byteLength: 2, color: '#f48fb1' },
];

const FORMAT_DISPLAY: Record<string, string> = {
  PCM: 'PCM',
  IEEE_FLOAT: 'IEEE Float',
  ALAW: 'A-Law',
  MULAW: 'μ-Law',
  IMA_ADPCM: 'IMA ADPCM',
  EXTENSIBLE: 'Extensible',
};

@Component({
  selector: 'app-fmt-detail',
  standalone: true,
  templateUrl: './fmt-detail.component.html',
  styleUrls: ['./fmt-detail.component.css'],
  imports: [AudioParamCardComponent, ChunkHexViewerComponent],
})
export class FmtDetailComponent {
  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly fmtHighlights: ChunkHighlight[] = FMT_HIGHLIGHTS;

  protected readonly fmt = computed((): FmtParsed | null => {
    const parsed = this.chunk().parsed;
    return parsed?.chunkType === 'fmt' ? parsed : null;
  });

  protected readonly audioFormatLabel = computed((): string => {
    const f = this.fmt();
    if (!f) return '–';
    const displayName = FORMAT_DISPLAY[f.audioFormatName] ?? f.audioFormatName;
    return `${f.audioFormat} – ${displayName}`;
  });

  protected readonly channelsLabel = computed((): string => {
    const f = this.fmt();
    if (!f) return '–';
    if (f.channels === 1) return 'Mono';
    if (f.channels === 2) return 'Stereo';
    return `${f.channels} kanálů`;
  });

  protected readonly sampleRateLabel = computed((): string => {
    const f = this.fmt();
    return f ? `${f.sampleRate.toLocaleString('cs-CZ')} Hz` : '–';
  });

  protected readonly bitsPerSampleLabel = computed((): string => {
    const f = this.fmt();
    return f ? `${f.bitsPerSample} bit` : '–';
  });

  protected readonly byteRateLabel = computed((): string => {
    const f = this.fmt();
    return f ? `${f.byteRate.toLocaleString('cs-CZ')} B/s` : '–';
  });

  protected readonly blockAlignLabel = computed((): string => {
    const f = this.fmt();
    return f ? `${f.blockAlign} B` : '–';
  });

  protected readonly expectedByteRate = computed((): number | null => {
    const f = this.fmt();
    if (!f) return null;
    return f.sampleRate * f.channels * Math.floor(f.bitsPerSample / 8);
  });

  protected readonly byteRateMismatch = computed((): boolean => {
    const f = this.fmt();
    const expected = this.expectedByteRate();
    return f !== null && expected !== null && f.byteRate !== expected;
  });

  protected readonly expectedByteRateLabel = computed((): string => {
    const expected = this.expectedByteRate();
    return expected !== null ? `${expected.toLocaleString('cs-CZ')} B/s` : '';
  });

  protected readonly showExtensible = computed((): boolean => {
    const f = this.fmt();
    return f?.extensible?.validBitsPerSample !== undefined;
  });

  protected readonly channelMaskHex = computed((): string | null => {
    const mask = this.fmt()?.extensible?.channelMask;
    if (mask === undefined || mask === null) return null;
    return `0x${mask.toString(16).toUpperCase().padStart(4, '0')}`;
  });
}