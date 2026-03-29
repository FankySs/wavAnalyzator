import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import type {
  AdtlParsed,
  CueParsed,
  UpdateAdtlDto,
  UpdateAdtlEntryDto,
  UpdateCueDto,
  WavChunkDetailDto,
} from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ConfirmInlineComponent } from '../../../../components/confirm-inline/confirm-inline.component';
import { WaveformPlayerComponent } from '../../../../components/waveform-player/waveform-player.component';
import { samplesToTime, timeToSamples } from '../../../../utils/time.utils';

type LocalPoint = {
  id: number; // negative = temporary (not yet saved to server)
  sampleOffset: number;
};

type PanelMode = 'view' | 'edit' | 'new';

@Component({
  selector: 'app-cue-detail',
  standalone: true,
  templateUrl: './cue-detail.component.html',
  styleUrls: ['./cue-detail.component.css'],
  imports: [FormsModule, ConfirmInlineComponent, WaveformPlayerComponent],
})
export class CueDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elRef = inject(ElementRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  // Cue point state
  protected readonly livePoints: WritableSignal<LocalPoint[]> = signal([]);
  protected readonly savedPoints: WritableSignal<LocalPoint[]> = signal([]);

  // Adtl state – labels keyed by LocalPoint.id (= server cuePointId for existing points)
  private readonly adtlChunkDbId: WritableSignal<string | null> = signal(null);
  private readonly localLabels: WritableSignal<Map<number, string>> = signal(new Map());
  private readonly savedLabels: WritableSignal<Map<number, string>> = signal(new Map());

  // Panel state
  protected readonly panelMode: WritableSignal<PanelMode | null> = signal(null);
  protected readonly selectedId: WritableSignal<number | null> = signal(null);

  // Form state (for edit / new modes)
  protected formSamples = 0;
  protected formTimeStr = '';
  protected formLabel = '';
  protected readonly formError: WritableSignal<string | null> = signal(null);

  // Inline delete confirm
  protected readonly pendingDeleteId: WritableSignal<number | null> = signal(null);

  // Global save state
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  // Sample rate from waveform player
  private readonly resolvedSampleRate: WritableSignal<number> = signal(44100);

  // Add-point mode
  protected readonly isAddingPoint: WritableSignal<boolean> = signal(false);

  private nextTempId = -1;

  // ── Computed ────────────────────────────────────────────────────────────────

  protected readonly hasUnsavedChanges = computed(() => {
    const live = this.livePoints();
    const saved = this.savedPoints();
    if (live.length !== saved.length) return true;
    if (live.some((p, i) => p.sampleOffset !== saved[i]?.sampleOffset)) return true;
    const local = this.localLabels();
    const savedL = this.savedLabels();
    for (const pt of live) {
      if ((local.get(pt.id) ?? '') !== (savedL.get(pt.id) ?? '')) return true;
    }
    return false;
  });

  protected readonly markerPositions = computed(() => {
    const sr = this.resolvedSampleRate();
    const selId = this.selectedId();
    const labels = this.localLabels();
    return this.livePoints().map((pt, idx) => ({
      id: pt.id,
      sampleOffset: pt.sampleOffset,
      timeStr: samplesToTime(pt.sampleOffset, sr),
      label: `Cue #${idx + 1}`,
      adtlLabel: labels.get(pt.id) ?? '',
      isSelected: pt.id === selId,
    }));
  });

  protected readonly selectedPoint = computed(() => {
    const id = this.selectedId();
    if (id === null) return null;
    const pts = this.livePoints();
    const idx = pts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const pt = pts[idx];
    return {
      ...pt,
      label: `Cue #${idx + 1}`,
      adtlLabel: this.localLabels().get(pt.id) ?? '',
      timeStr: samplesToTime(pt.sampleOffset, this.resolvedSampleRate()),
    };
  });

  // ── Init ────────────────────────────────────────────────────────────────────

  constructor() {
    // Load cue points from chunk input
    effect(() => {
      const chunkInput = this.chunk();
      const parsed = chunkInput.parsed as CueParsed | null;
      const pts: LocalPoint[] =
        parsed?.chunkType === 'cue'
          ? parsed.points.map((p) => ({ id: p.id, sampleOffset: p.sampleOffset }))
          : [];
      this.livePoints.set(pts);
      this.savedPoints.set(pts.map((p) => ({ ...p })));
    });

    // Load adtl labels separately
    effect(() => {
      const wavId = this.wavId();
      this.adtlChunkDbId.set(null);
      this.localLabels.set(new Map());
      this.savedLabels.set(new Map());
      this.loadAdtl(wavId);
    });
  }

  // ── Adtl loading ─────────────────────────────────────────────────────────────

  private loadAdtl(wavId: string): void {
    this.wavApiService
      .getChunks(wavId)
      .pipe(
        switchMap((chunks) => {
          const listChunks = chunks.filter((c) => c.chunkId === 'LIST');
          if (listChunks.length === 0) return of([] as WavChunkDetailDto[]);
          return forkJoin(listChunks.map((c) => this.wavApiService.getChunkDetail(wavId, c.id)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (details) => {
          const adtlDetail = details.find((d) => d.parsed?.chunkType === 'adtl');
          if (!adtlDetail) return;
          this.adtlChunkDbId.set(adtlDetail.id);
          const parsed = adtlDetail.parsed as AdtlParsed;
          const labelMap = new Map<number, string>();
          for (const e of parsed.entries) {
            if (e.id === 'labl' && e.text) {
              labelMap.set(e.cuePointId, e.text);
            }
          }
          this.localLabels.set(new Map(labelMap));
          this.savedLabels.set(new Map(labelMap));
        },
      });
  }

  // ── Waveform player ──────────────────────────────────────────────────────────

  protected readonly onSampleRateChange = (sr: number): void => {
    this.resolvedSampleRate.set(sr);
  };

  // ── Panel actions ───────────────────────────────────────────────────────────

  protected readonly onAddPointClick = (): void => {
    this.isAddingPoint.set(true);
  };

  protected readonly onCancelAddPoint = (): void => {
    this.isAddingPoint.set(false);
  };

  protected readonly onPointAdded = (sampleOffset: number): void => {
    const newId = this.nextTempId--;
    this.livePoints.update((pts) =>
      [...pts, { id: newId, sampleOffset }].sort((a, b) => a.sampleOffset - b.sampleOffset),
    );
    this.selectedId.set(newId);
    this.panelMode.set('view');
    this.isAddingPoint.set(false);
  };

  protected readonly onPanelEdit = (): void => {
    const pt = this.selectedPoint();
    if (!pt) return;
    this.formSamples = pt.sampleOffset;
    this.formTimeStr = samplesToTime(pt.sampleOffset, this.resolvedSampleRate());
    this.formLabel = pt.adtlLabel;
    this.formError.set(null);
    this.panelMode.set('edit');
  };

  protected readonly onPanelCancel = (): void => {
    if (this.panelMode() === 'new') {
      this.panelMode.set(null);
      this.selectedId.set(null);
    } else {
      this.panelMode.set('view');
    }
    this.formError.set(null);
  };

  protected readonly onSamplesInput = (): void => {
    this.formTimeStr = samplesToTime(this.formSamples, this.resolvedSampleRate());
  };

  protected readonly onTimeStrInput = (): void => {
    this.formSamples = timeToSamples(this.formTimeStr, this.resolvedSampleRate());
  };

  protected readonly onPanelSave = (): void => {
    const samples = this.formSamples;
    if (samples < 0) {
      this.formError.set('Pozice nesmí být záporná.');
      return;
    }

    const mode = this.panelMode();

    if (mode === 'edit') {
      const id = this.selectedId()!;
      this.livePoints.update((pts) =>
        pts.map((p) => (p.id === id ? { ...p, sampleOffset: samples } : p)),
      );
      this.localLabels.update((m) => {
        const next = new Map(m);
        next.set(id, this.formLabel);
        return next;
      });
      this.panelMode.set('view');
    } else if (mode === 'new') {
      const newId = this.nextTempId--;
      this.livePoints.update((pts) =>
        [...pts, { id: newId, sampleOffset: samples }].sort(
          (a, b) => a.sampleOffset - b.sampleOffset,
        ),
      );
      this.localLabels.update((m) => {
        const next = new Map(m);
        next.set(newId, this.formLabel);
        return next;
      });
      this.selectedId.set(newId);
      this.panelMode.set('view');
    }
    this.formError.set(null);
  };

  protected readonly onDeleteRequest = (id: number): void => {
    this.pendingDeleteId.set(id);
  };

  protected readonly onDeleteConfirm = (): void => {
    const id = this.pendingDeleteId();
    if (id === null) return;
    this.livePoints.update((pts) => pts.filter((p) => p.id !== id));
    this.localLabels.update((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
    this.pendingDeleteId.set(null);
    this.selectedId.set(null);
    this.panelMode.set(null);
  };

  protected readonly onDeleteCancel = (): void => {
    this.pendingDeleteId.set(null);
  };

  protected readonly onRowClick = (id: number): void => {
    this.selectedId.set(id);
    this.panelMode.set('view');
    this.pendingDeleteId.set(null);
    this.formError.set(null);
  };

  // ── Document click – deselect when clicking outside panel/table/canvas ──────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.selectedId() === null) return;
    const target = event.target as HTMLElement;
    const nativeEl = this.elRef.nativeElement as HTMLElement;
    const isInsidePanel = nativeEl.querySelector('.panel-card')?.contains(target) ?? false;
    const isInsideTable = nativeEl.querySelector('.table-card')?.contains(target) ?? false;
    const isInsideCanvas = target.tagName === 'CANVAS';

    if (!isInsidePanel && !isInsideTable && !isInsideCanvas) {
      this.selectedId.set(null);
      this.panelMode.set(null);
      this.pendingDeleteId.set(null);
      this.formError.set(null);
    }
  }

  // ── Global save ─────────────────────────────────────────────────────────────

  protected readonly onGlobalSave = (): void => {
    const liveSnapshot = [...this.livePoints()];
    const currentLabels = new Map(this.localLabels());

    const cueDto: UpdateCueDto = {
      points: liveSnapshot.map((p) => ({ sampleOffset: p.sampleOffset })),
    };

    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);

    this.wavApiService
      .updateCue(this.wavId(), this.chunk().id, cueDto)
      .pipe(
        switchMap((updatedCue) => {
          const parsed = updatedCue.parsed as CueParsed;
          const adtlChunkId = this.adtlChunkDbId();

          // Both arrays sorted by sampleOffset – map by position index
          const serverPts = [...parsed.points].sort((a, b) => a.sampleOffset - b.sampleOffset);
          const sortedSnapshot = [...liveSnapshot].sort((a, b) => a.sampleOffset - b.sampleOffset);

          const newLabels = new Map<number, string>();
          serverPts.forEach((serverPt, idx) => {
            const oldId = sortedSnapshot[idx]?.id;
            const label = oldId !== undefined ? (currentLabels.get(oldId) ?? '') : '';
            if (label) newLabels.set(serverPt.id, label);
          });

          const adtlEntries: UpdateAdtlEntryDto[] = Array.from(newLabels.entries()).map(
            ([cuePointId, text]) => ({ cuePointId, type: 'labl' as const, text }),
          );
          const adtlDto: UpdateAdtlDto = { entries: adtlEntries };
          const newPts: LocalPoint[] = serverPts.map((p) => ({
            id: p.id,
            sampleOffset: p.sampleOffset,
          }));

          let adtl$: Observable<unknown>;
          if (!newLabels.size && !adtlChunkId) {
            adtl$ = of(null);
          } else if (adtlChunkId) {
            adtl$ = this.wavApiService.updateAdtl(this.wavId(), adtlChunkId, adtlDto);
          } else {
            adtl$ = this.wavApiService
              .createAdtl(this.wavId(), adtlDto)
              .pipe(tap((chunk) => this.adtlChunkDbId.set(chunk.id)));
          }

          return adtl$.pipe(map(() => ({ newPts, newLabels })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ newPts, newLabels }) => {
          this.livePoints.set(newPts);
          this.savedPoints.set(newPts.map((p) => ({ ...p })));
          this.localLabels.set(new Map(newLabels));
          this.savedLabels.set(new Map(newLabels));
          this.selectedId.set(null);
          this.panelMode.set(null);
          this.isSaving.set(false);
          this.savingChange.emit(false);
        },
        error: (err: Error) => {
          this.saveError.set(err.message);
          this.isSaving.set(false);
          this.savingChange.emit(false);
        },
      });
  };
}