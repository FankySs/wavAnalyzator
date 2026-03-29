import { Component, WritableSignal, input, output, signal } from '@angular/core';
import type { CreateCueDto, CuePointDto } from '@shared-types';

@Component({
  selector: 'app-cue-create',
  standalone: true,
  templateUrl: './cue-create.component.html',
})
export class CueCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateCueDto>();
  readonly cancelled = output<void>();

  protected readonly points: WritableSignal<CuePointDto[]> = signal([{ sampleOffset: 0 }]);

  protected readonly addPoint = (): void => {
    this.points.update((p) => [...p, { sampleOffset: 0 }]);
  };

  protected readonly removePoint = (index: number): void => {
    this.points.update((p) => p.filter((_, i) => i !== index));
  };

  protected readonly updatePoint = (index: number, val: number): void => {
    this.points.update((p) =>
      p.map((item, i) => (i === index ? { sampleOffset: val } : item)),
    );
  };

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ points: this.points() });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}