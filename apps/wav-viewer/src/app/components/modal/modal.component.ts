import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
})
export class ModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly title = input<string>('');
  readonly closed = output<void>();

  protected readonly onOverlayClick = (): void => {
    this.closed.emit();
  };

  protected readonly onBoxClick = (event: Event): void => {
    event.stopPropagation();
  };
}
