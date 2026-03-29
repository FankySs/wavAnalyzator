import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-inline',
  standalone: true,
  templateUrl: './confirm-inline.component.html',
  styleUrls: ['./confirm-inline.component.css'],
})
export class ConfirmInlineComponent {
  readonly message = input<string>('Opravdu smazat?');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
