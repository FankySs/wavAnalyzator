import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateBextDto } from '@shared-types';

@Component({
  selector: 'app-bext-create',
  standalone: true,
  templateUrl: './bext-create.component.html',
  imports: [FormsModule],
})
export class BextCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateBextDto>();
  readonly cancelled = output<void>();

  protected bext: CreateBextDto = {
    description: '',
    originator: '',
    originatorReference: '',
    originationDate: new Date().toISOString().slice(0, 10),
    originationTime: '00:00:00',
    timeReferenceLow: 0,
    timeReferenceHigh: 0,
  };

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ ...this.bext });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}