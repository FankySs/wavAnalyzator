import { Component, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { WavChunkDetailDto } from '@shared-types';
import { ChunkHexViewerComponent, type ChunkHighlight } from '../../../../components/chunk-hex-viewer/chunk-hex-viewer.component';

const JUNK_HIGHLIGHTS: ChunkHighlight[] = [
  { label: 'ID',   byteOffset: 0, byteLength: 4,  color: 'var(--brand)',   description: '4bajtový ASCII identifikátor chunku' },
  { label: 'Size', byteOffset: 4, byteLength: 4,  color: 'var(--success)', description: 'Velikost těla chunku v bajtech' },
  { label: 'Data', byteOffset: 8, byteLength: -1, color: 'var(--muted)',   description: 'Výplňová data – obvykle nuly nebo náhodné bajty pro zarovnání' },
];

@Component({
  selector: 'app-junk-detail',
  standalone: true,
  templateUrl: './junk-detail.component.html',
  styleUrls: ['./junk-detail.component.css'],
  imports: [DecimalPipe, ChunkHexViewerComponent],
})
export class JunkDetailComponent {
  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();
  protected readonly activeHighlight = signal<string | null>(null);
  protected readonly junkHighlights: ChunkHighlight[] = JUNK_HIGHLIGHTS;
}
