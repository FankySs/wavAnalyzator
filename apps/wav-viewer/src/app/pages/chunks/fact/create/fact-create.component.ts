import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateFactDto } from '@shared-types';

@Component({
  selector: 'app-fact-create',
  standalone: true,
  templateUrl: './fact-create.component.html',
  imports: [FormsModule],
})
export class FactCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateFactDto>();
  readonly cancelled = output<void>();

  protected sampleLength = 0;

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ sampleLength: this.sampleLength });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}