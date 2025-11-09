import { Injectable, signal } from '@angular/core';
import { parseWavArrayBuffer, ParsedWav, RiffChunk } from '@riff-parser';

@Injectable({ providedIn: 'root' })
export class WavAnalyzerService {
  private readonly _parsed = signal<ParsedWav | null>(null);
  private readonly _error  = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _buffer = signal<ArrayBuffer | null>(null);

  readonly parsed  = this._parsed.asReadonly();
  readonly error   = this._error.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly buffer  = this._buffer.asReadonly();

  clear() {
    this._parsed.set(null);
    this._error.set(null);
    this._loading.set(false);
    this._buffer.set(null);
  }

  async analyzeFile(file: File) {
    this._loading.set(true);
    try {
      const buf = await file.arrayBuffer();
      this._buffer.set(buf);
      this._parsed.set(parseWavArrayBuffer(buf));
      this._error.set(null);
    } catch (e) {
      this._parsed.set(null);
      this._error.set(e instanceof Error ? e.message : 'Neznámá chyba');
    } finally {
      this._loading.set(false);
    }
  }

  /** Vrátí payload chunku jako bytes */
  getChunkPayloadBytes(chunk: RiffChunk, max?: number): Uint8Array | null {
    const buf = this._buffer();
    if (!buf) return null;
    const len = Math.min(chunk.size, max ?? chunk.size);
    return new Uint8Array(buf, chunk.payloadOffset, len);
  }
}
