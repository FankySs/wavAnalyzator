import { Component, input } from '@angular/core';

@Component({
  selector: 'app-audio-param-card',
  standalone: true,
  templateUrl: './audio-param-card.component.html',
  styleUrls: ['./audio-param-card.component.css'],
})
export class AudioParamCardComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
}
