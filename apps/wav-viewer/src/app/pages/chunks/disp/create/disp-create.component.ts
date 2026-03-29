import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateDispDto } from '@shared-types';

@Component({
  selector: 'app-disp-create',
  standalone: true,
  templateUrl: './disp-create.component.html',
  imports: [FormsModule],
})
export class DispCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateDispDto>();
  readonly cancelled = output<void>();

  protected text = '';

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ text: this.text });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}