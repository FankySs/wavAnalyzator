import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { WaveformDto } from '@shared-types';
import { WavApiService } from '../../services/wav-api.service';

export type CueMarker = { id: number; sampleOffset: number };

@Component({
  selector: 'app-waveform-player',
  standalone: true,
  templateUrl: './waveform-player.component.html',
  styleUrls: ['./waveform-player.component.css'],
})
export class WaveformPlayerComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly wavId = input.required<string>();
  readonly showCuePoints = input<boolean>(false);
  readonly cuePoints = input<CueMarker[]>([]);
  readonly addPointMode = input<boolean>(false);
  readonly selectedPointId = input<number | null>(null);

  readonly sampleRateChange = output<number>();
  readonly pointAdded = output<number>();

  private readonly waveformCanvas = viewChild<ElementRef<HTMLCanvasElement>>('waveformCanvas');
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('container');
  private readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

  private readonly waveform = signal<WaveformDto | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  protected readonly isPlaying = signal(false);
  private readonly canvasWidth = signal(800);

  protected readonly streamUrl = computed(() =>
    this.wavApiService.getStreamUrl(this.wavId()),
  );

  protected readonly cursorStyle = computed(() =>
    this.addPointMode() ? 'crosshair' : 'pointer',
  );

  constructor() {
    effect(() => {
      this.cuePoints();
      this.showCuePoints();
      this.selectedPointId();
      if (this.waveform()) {
        requestAnimationFrame(() => this.drawWaveform());
      }
    });

    afterNextRender(() => {
      const width = this.container()?.nativeElement.clientWidth || 800;
      this.canvasWidth.set(width);

      this.wavApiService
        .getWaveform(this.wavId(), width)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            this.waveform.set(data);
            this.duration.set(data.durationSec);
            this.sampleRateChange.emit(data.sampleRate);
            this.isLoading.set(false);
            requestAnimationFrame(() => this.drawWaveform());
          },
          error: () => {
            this.error.set('Waveform není dostupný.');
            this.isLoading.set(false);
          },
        });
    });
  }

  protected readonly onCanvasClick = (event: MouseEvent): void => {
    const canvasRef = this.waveformCanvas();
    if (!canvasRef) return;
    const canvas = canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;

    if (this.addPointMode()) {
      const wf = this.waveform();
      if (!wf) return;
      const sampleOffset = Math.round(fraction * wf.durationSec * wf.sampleRate);
      this.pointAdded.emit(sampleOffset);
      return;
    }

    const audio = this.audioEl()?.nativeElement;
    if (!audio) return;
    audio.currentTime = fraction * this.duration();
    this.currentTime.set(audio.currentTime);
    this.drawWaveform();
  };

  protected readonly onPlayPause = (): void => {
    const audio = this.audioEl()?.nativeElement;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  protected readonly onPlay = (): void => {
    this.isPlaying.set(true);
  };

  protected readonly onPause = (): void => {
    this.isPlaying.set(false);
  };

  protected readonly onTimeUpdate = (): void => {
    const audio = this.audioEl()?.nativeElement;
    if (!audio) return;
    this.currentTime.set(audio.currentTime);
    this.drawWaveform();
  };

  protected readonly onMetadataLoaded = (): void => {
    const audio = this.audioEl()?.nativeElement;
    if (!audio) return;
    if (audio.duration && isFinite(audio.duration)) {
      this.duration.set(audio.duration);
    }
  };

  protected readonly onEnded = (): void => {
    this.isPlaying.set(false);
  };

  protected readonly formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  private drawWaveform(): void {
    const canvasRef = this.waveformCanvas();
    if (!canvasRef) return;
    const canvas = canvasRef.nativeElement;
    const wf = this.waveform();
    if (!wf) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || this.canvasWidth();
    const height = canvas.clientHeight || 80;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const points = wf.points;
    const paddingY = 12;
    const innerHeight = height - paddingY * 2;
    const midY = paddingY + innerHeight / 2;
    const barWidth = width / points.length;

    ctx.clearRect(0, 0, width, height);

    const playedFraction = this.duration() > 0 ? this.currentTime() / this.duration() : 0;

    points.forEach((point, i) => {
      const x = i * barWidth;
      const maxY = midY - point.max * (innerHeight / 2);
      const minY = midY - point.min * (innerHeight / 2);
      const barHeight = minY - maxY;

      ctx.fillStyle =
        i / points.length < playedFraction ? 'var(--brand)' : 'rgba(255,255,255,0.3)';

      ctx.fillRect(x, maxY, Math.max(1, barWidth - 0.5), Math.max(1, barHeight));
    });

    if (this.duration() > 0) {
      const playheadX = (this.currentTime() / this.duration()) * width;
      ctx.strokeStyle = 'var(--brand)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }

    if (this.showCuePoints() && this.duration() > 0) {
      const sr = wf.sampleRate;
      const selId = this.selectedPointId();
      this.cuePoints().forEach((point) => {
        const timeSec = point.sampleOffset / sr;
        const x = (timeSec / this.duration()) * width;
        const isSelected = point.id === selId;
        const label = `#${point.id}`;

        // Dark outline for visibility on both blue and gray backgrounds
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = isSelected ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Marker line on top
        ctx.strokeStyle = isSelected ? '#ffffff' : 'var(--warning)';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Label background
        ctx.font = `${isSelected ? 'bold ' : ''}11px var(--font-mono)`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x + 2, 2, textWidth + 4, 14);

        // Label text
        ctx.fillStyle = isSelected ? '#ffffff' : 'var(--warning)';
        ctx.fillText(label, x + 4, 13);
      });
    }
  }
}