import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateAxmlDto } from '@shared-types';

@Component({
  selector: 'app-axml-create',
  standalone: true,
  templateUrl: './axml-create.component.html',
  imports: [FormsModule],
})
export class AxmlCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateAxmlDto>();
  readonly cancelled = output<void>();

  protected xml = '';

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ xml: this.xml });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}