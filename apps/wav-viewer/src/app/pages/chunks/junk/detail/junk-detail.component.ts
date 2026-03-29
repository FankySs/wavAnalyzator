import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { WavChunkDetailDto } from '@shared-types';

@Component({
  selector: 'app-junk-detail',
  standalone: true,
  templateUrl: './junk-detail.component.html',
  styleUrls: ['./junk-detail.component.css'],
  imports: [DecimalPipe],
})
export class JunkDetailComponent {
  readonly chunk = input.required<WavChunkDetailDto>();
}
