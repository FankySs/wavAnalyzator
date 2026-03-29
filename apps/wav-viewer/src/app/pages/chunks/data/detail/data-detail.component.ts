import { Component, input } from '@angular/core';
import type { WavChunkDetailDto } from '@shared-types';
import { WaveformPlayerComponent } from '../../../../components/waveform-player/waveform-player.component';
import { formatFileSize } from '../../../../utils/format.utils';

@Component({
  selector: 'app-data-detail',
  standalone: true,
  templateUrl: './data-detail.component.html',
  styleUrls: ['./data-detail.component.css'],
  imports: [WaveformPlayerComponent],
})
export class DataDetailComponent {
  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  protected readonly formatSize = formatFileSize;
}