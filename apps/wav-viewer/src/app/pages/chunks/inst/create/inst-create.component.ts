import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateInstDto } from '@shared-types';

@Component({
  selector: 'app-inst-create',
  standalone: true,
  templateUrl: './inst-create.component.html',
  imports: [FormsModule],
})
export class InstCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateInstDto>();
  readonly cancelled = output<void>();

  protected inst: CreateInstDto = {
    unshiftedNote: 60,
    fineTune: 0,
    gain: 0,
    lowNote: 0,
    highNote: 127,
    lowVelocity: 1,
    highVelocity: 127,
  };

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ ...this.inst });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}