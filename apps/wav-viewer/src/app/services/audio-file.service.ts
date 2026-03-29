import { Injectable, Signal, WritableSignal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioFileService {
  private readonly _file: WritableSignal<File | null> = signal<File | null>(null);
  private readonly _objectUrl: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _wavFileId: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _wavSampleRate: WritableSignal<number | null> = signal<number | null>(null);
  private readonly _wavDurationSec: WritableSignal<number | null> = signal<number | null>(null);

  readonly file: Signal<File | null> = this._file.asReadonly();
  readonly objectUrl: Signal<string | null> = this._objectUrl.asReadonly();
  /** ID záznamu WavFile v DB po úspěšném uploadu na BE. */
  readonly wavFileId: Signal<string | null> = this._wavFileId.asReadonly();
  /** Sample rate aktivně zobrazeného WAV souboru (null pokud není načten). */
  readonly wavSampleRate: Signal<number | null> = this._wavSampleRate.asReadonly();
  /** Délka aktivně zobrazeného WAV souboru v sekundách (null pokud není načten). */
  readonly wavDurationSec: Signal<number | null> = this._wavDurationSec.asReadonly();

  readonly setFile = (file: File | null): void => {
    const oldUrl = this._objectUrl();
    if (oldUrl !== null) URL.revokeObjectURL(oldUrl);

    if (file === null) {
      this._file.set(null);
      this._objectUrl.set(null);
      return;
    }

    this._file.set(file);
    this._objectUrl.set(URL.createObjectURL(file));
  };

  readonly setWavFileId = (id: string | null): void => {
    this._wavFileId.set(id);
  };

  readonly setWavMeta = (sampleRate: number | null, durationSec: number | null): void => {
    this._wavSampleRate.set(sampleRate);
    this._wavDurationSec.set(durationSec);
  };

  readonly clear = (): void => {
    this.setFile(null);
    this._wavFileId.set(null);
    this._wavSampleRate.set(null);
    this._wavDurationSec.set(null);
  };
}
