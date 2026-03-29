import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateIxmlDto } from '@shared-types';

@Component({
  selector: 'app-ixml-create',
  standalone: true,
  templateUrl: './ixml-create.component.html',
  imports: [FormsModule],
})
export class IxmlCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateIxmlDto>();
  readonly cancelled = output<void>();

  protected xml = '<BWFXML></BWFXML>';

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ xml: this.xml });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}