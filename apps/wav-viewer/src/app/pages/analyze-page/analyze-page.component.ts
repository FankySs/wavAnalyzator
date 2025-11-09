import { Component, Signal, WritableSignal, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AudioFileService } from '../../services/audio-file.service';
import { WavAnalyzerService } from '../../services/wav-analyzer.service';
import { ParsedWav, RiffChunk } from '@riff-parser';

@Component({
  selector: 'app-analyze-page',
  standalone: true,
  templateUrl: './analyze-page.component.html',
  styleUrls: ['./analyze-page.component.css'],
  imports: [RouterLink, DecimalPipe],
})
export class AnalyzePageComponent {
  private readonly audioFileService = inject(AudioFileService);
  private readonly analyzer = inject(WavAnalyzerService);

  protected readonly objectUrl: Signal<string | null> = this.audioFileService.objectUrl;
  protected readonly parsed: Signal<ParsedWav | null> = this.analyzer.parsed;
  protected readonly isLoading: Signal<boolean> = this.analyzer.isLoading;
  protected readonly error: Signal<string | null> = this.analyzer.error;

  protected readonly selectedChunk: WritableSignal<RiffChunk | null> = signal<RiffChunk | null>(null);
  protected readonly previewLines: WritableSignal<string[] | null> = signal<string[] | null>(null);

  constructor() {
    effect(() => {
      const file = this.audioFileService.file();
      this.analyzer.clear();
      this.selectedChunk.set(null);
      this.previewLines.set(null);
      if (file) void this.analyzer.analyzeFile(file);
    });
  }

  protected readonly clear: () => void = (): void => {
    this.audioFileService.clear();
    this.analyzer.clear();
    this.selectedChunk.set(null);
    this.previewLines.set(null);
  };

  protected readonly onSelectChunk: (c: RiffChunk) => void = (c) => {
    this.selectedChunk.set(c);
    const bytes = this.analyzer.getChunkPayloadBytes(c, 256);
    if (!bytes) {
      this.previewLines.set(['<no data>']);
      return;
    }
    this.previewLines.set(this.formatHexDump(bytes));
  };

  private formatHexDump(bytes: Uint8Array, width = 16): string[] {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const toAscii = (n: number) => {
      const c = n & 0xff;
      return c >= 32 && c < 127 ? String.fromCharCode(c) : '.';
    };

    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += width) {
      const slice = bytes.subarray(i, i + width);
      const hex = Array.from(slice).map(toHex).join(' ');
      const ascii = Array.from(slice).map(toAscii).join('');
      lines.push(`${i.toString(16).padStart(6, '0')}  ${hex.padEnd(width * 3 - 1, ' ')}  |${ascii}|`);
    }
    return lines;
  }
}
