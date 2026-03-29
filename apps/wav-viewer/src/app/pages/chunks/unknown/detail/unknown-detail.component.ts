import { Component, computed, input } from '@angular/core';
import type { WavChunkDetailDto } from '@shared-types';

@Component({
  selector: 'app-unknown-detail',
  standalone: true,
  templateUrl: './unknown-detail.component.html',
  styleUrls: ['./unknown-detail.component.css'],
})
export class UnknownDetailComponent {
  readonly chunk = input.required<WavChunkDetailDto>();

  protected readonly hexDump = computed((): string | null => {
    const parsed = this.chunk().parsed;
    if (!parsed) return null;

    const rawHex =
      parsed.chunkType === 'unknown' || parsed.chunkType === 'ID3'
        ? parsed.rawHex
        : null;

    if (!rawHex) return null;

    const bytes: number[] = [];
    for (let i = 0; i < rawHex.length - 1; i += 2) {
      bytes.push(parseInt(rawHex.slice(i, i + 2), 16));
    }

    const lines: string[] = [];
    for (let offset = 0; offset < bytes.length; offset += 16) {
      const slice = bytes.slice(offset, offset + 16);
      const addrStr = offset.toString(16).padStart(6, '0');

      const left = slice.slice(0, 8).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const right = slice.slice(8).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const hexPart = (left + (slice.length > 8 ? '  ' + right : '')).padEnd(48);

      const ascii = slice
        .map((b) => b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')
        .join('');

      lines.push(`${addrStr}  ${hexPart}  |${ascii}|`);
    }

    return lines.join('\n');
  });
}
