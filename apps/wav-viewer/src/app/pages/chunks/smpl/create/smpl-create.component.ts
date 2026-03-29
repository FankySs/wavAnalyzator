import { Component, WritableSignal, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateSmplDto, SmplLoopDto } from '@shared-types';

@Component({
  selector: 'app-smpl-create',
  standalone: true,
  templateUrl: './smpl-create.component.html',
  imports: [FormsModule],
})
export class SmplCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateSmplDto>();
  readonly cancelled = output<void>();

  protected midiUnityNote = 60;
  protected samplePeriod = 22676;

  protected readonly loops: WritableSignal<SmplLoopDto[]> = signal([]);

  protected readonly addLoop = (): void => {
    this.loops.update((l) => [...l, { start: 0, end: 0, type: 0, playCount: 0 }]);
  };

  protected readonly removeLoop = (index: number): void => {
    this.loops.update((l) => l.filter((_, i) => i !== index));
  };

  protected readonly updateLoop = (index: number, field: keyof SmplLoopDto, val: number): void => {
    this.loops.update((l) =>
      l.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  protected readonly onSubmit = (): void => {
    this.submitted.emit({
      midiUnityNote: this.midiUnityNote,
      samplePeriod: this.samplePeriod,
      loops: this.loops(),
    });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}