import { Component, computed, input } from '@angular/core';
import type { WavChunkDetailDto, FmtParsed } from '@shared-types';
import { AudioParamCardComponent } from '../../../../components/audio-param-card/audio-param-card.component';

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
  imports: [AudioParamCardComponent],
})
export class FmtDetailComponent {
  readonly chunk = input.required<WavChunkDetailDto>();

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