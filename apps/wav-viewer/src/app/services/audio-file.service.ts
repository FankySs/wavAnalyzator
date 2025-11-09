import { Injectable, Signal, WritableSignal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioFileService {
  private readonly _file: WritableSignal<File | null> = signal<File | null>(null);
  private readonly _objectUrl: WritableSignal<string | null> = signal<string | null>(null);

  public readonly file: Signal<File | null> = this._file.asReadonly();
  public readonly objectUrl: Signal<string | null> = this._objectUrl.asReadonly();

  /** Nastaví nový soubor a spravuje Object URL. */
  public readonly setFile: (file: File | null) => void = (file: File | null): void => {
    const oldUrl: string | null = this._objectUrl();
    if (oldUrl !== null) URL.revokeObjectURL(oldUrl);

    if (file === null) {
      this._file.set(null);
      this._objectUrl.set(null);
      return;
    }

    this._file.set(file);
    const url: string = URL.createObjectURL(file);
    this._objectUrl.set(url);
  };

  /** Vyčistí stav. */
  public readonly clear: () => void = (): void => this.setFile(null);
}
