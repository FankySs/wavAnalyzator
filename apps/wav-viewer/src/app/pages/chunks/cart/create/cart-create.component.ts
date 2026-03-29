import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CreateCartDto } from '@shared-types';

@Component({
  selector: 'app-cart-create',
  standalone: true,
  templateUrl: './cart-create.component.html',
  imports: [FormsModule],
})
export class CartCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateCartDto>();
  readonly cancelled = output<void>();

  protected cart: CreateCartDto = {
    title: '',
    artist: '',
    category: '',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '00:00:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '23:59:59',
    url: '',
  };

  protected readonly onSubmit = (): void => {
    this.submitted.emit({ ...this.cart });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}