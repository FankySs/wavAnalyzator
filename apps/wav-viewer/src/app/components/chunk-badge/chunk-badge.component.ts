import { Component, computed, input } from '@angular/core';

const BADGE_COLORS: Record<string, string> = {
  'fmt ': 'blue',
  'data': 'audio',
  'LIST': 'green',
  'bext': 'purple',
  'cue ': 'orange',
  'smpl': 'teal',
  'fact': 'blue',
  'inst': 'teal',
  'cart': 'purple',
  'DISP': 'blue',
  'ixml': 'green',
  'iXML': 'green',
  'axml': 'green',
  'PEAK': 'orange',
  'levl': 'orange',
  'umid': 'purple',
  'JUNK': 'gray',
  'PAD ': 'gray',
  'FLLR': 'gray',
  'id3 ': 'gray',
  'ID3 ': 'gray',
};

@Component({
  selector: 'app-chunk-badge',
  standalone: true,
  templateUrl: './chunk-badge.component.html',
  styleUrls: ['./chunk-badge.component.css'],
})
export class ChunkBadgeComponent {
  readonly chunkId = input.required<string>();

  protected readonly colorClass = computed(() =>
    `badge-${BADGE_COLORS[this.chunkId()] ?? 'gray'}`,
  );
}
