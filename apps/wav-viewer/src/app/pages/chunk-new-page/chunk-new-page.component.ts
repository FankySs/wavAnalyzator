import {
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import type {
  CreateListInfoDto,
  CreateBextDto,
  CreateCueDto,
  CreateFactDto,
  CreateInstDto,
  CreateSmplDto,
  CreateCartDto,
  CreateDispDto,
  CreateIxmlDto,
  CreateAxmlDto,
  WavChunkDto,
} from '@shared-types';
import { WavApiService } from '../../services/wav-api.service';
import { ChunkBadgeComponent } from '../../components/chunk-badge/chunk-badge.component';
import { type ChunkTypeId, SINGLE_INSTANCE_4CC, CHUNK_TYPES } from './chunk-types';
import {
  ListInfoCreateComponent,
  BextCreateComponent,
  CueCreateComponent,
  FactCreateComponent,
  InstCreateComponent,
  SmplCreateComponent,
  CartCreateComponent,
  DispCreateComponent,
  IxmlCreateComponent,
  AxmlCreateComponent,
} from '../chunks';

@Component({
  selector: 'app-chunk-new-page',
  standalone: true,
  templateUrl: './chunk-new-page.component.html',
  styleUrls: ['./chunk-new-page.component.css'],
  imports: [
    RouterLink,
    ChunkBadgeComponent,
    ListInfoCreateComponent,
    BextCreateComponent,
    CueCreateComponent,
    FactCreateComponent,
    InstCreateComponent,
    SmplCreateComponent,
    CartCreateComponent,
    DispCreateComponent,
    IxmlCreateComponent,
    AxmlCreateComponent,
  ],
})
export class ChunkNewPageComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly isLoadingChunks: WritableSignal<boolean> = signal(true);
  protected readonly loadError: WritableSignal<string | null> = signal(null);
  private readonly existingChunkIds: WritableSignal<Set<string>> = signal(new Set());

  protected readonly availableTypes = computed(() =>
    CHUNK_TYPES.filter((ct) => {
      const fourCC = SINGLE_INSTANCE_4CC[ct.id];
      return fourCC === null || !this.existingChunkIds().has(fourCC);
    }),
  );

  protected readonly allUnavailable = computed(
    () => !this.isLoadingChunks() && !this.loadError() && this.availableTypes().length === 0,
  );

  protected readonly step: WritableSignal<1 | 2> = signal(1);
  protected readonly selectedType: WritableSignal<ChunkTypeId | null> = signal(null);
  protected readonly isSubmitting: WritableSignal<boolean> = signal(false);
  protected readonly error: WritableSignal<string | null> = signal(null);

  constructor() {
    effect(() => {
      const wavId = this.id();
      this.isLoadingChunks.set(true);
      this.loadError.set(null);
      this.wavApiService
        .getChunks(wavId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (chunks) => {
            this.existingChunkIds.set(new Set(chunks.map((c) => c.chunkId)));
            this.isLoadingChunks.set(false);
          },
          error: (err: Error) => {
            this.loadError.set(err.message);
            this.isLoadingChunks.set(false);
          },
        });
    });
  }

  protected readonly onSelectType = (type: ChunkTypeId): void => {
    this.selectedType.set(type);
    this.step.set(2);
    this.error.set(null);
  };

  protected readonly onBack = (): void => {
    this.step.set(1);
    this.error.set(null);
  };

  protected readonly onListInfoSubmit = (dto: CreateListInfoDto): void => {
    this.executeCreate(this.wavApiService.createListInfo(this.id(), dto));
  };
  protected readonly onBextSubmit = (dto: CreateBextDto): void => {
    this.executeCreate(this.wavApiService.createBext(this.id(), dto));
  };
  protected readonly onCueSubmit = (dto: CreateCueDto): void => {
    this.executeCreate(this.wavApiService.createCue(this.id(), dto));
  };
  protected readonly onFactSubmit = (dto: CreateFactDto): void => {
    this.executeCreate(this.wavApiService.createFact(this.id(), dto));
  };
  protected readonly onInstSubmit = (dto: CreateInstDto): void => {
    this.executeCreate(this.wavApiService.createInst(this.id(), dto));
  };
  protected readonly onSmplSubmit = (dto: CreateSmplDto): void => {
    this.executeCreate(this.wavApiService.createSmpl(this.id(), dto));
  };
  protected readonly onCartSubmit = (dto: CreateCartDto): void => {
    this.executeCreate(this.wavApiService.createCart(this.id(), dto));
  };
  protected readonly onDispSubmit = (dto: CreateDispDto): void => {
    this.executeCreate(this.wavApiService.createDisp(this.id(), dto));
  };
  protected readonly onIxmlSubmit = (dto: CreateIxmlDto): void => {
    this.executeCreate(this.wavApiService.createIxml(this.id(), dto));
  };
  protected readonly onAxmlSubmit = (dto: CreateAxmlDto): void => {
    this.executeCreate(this.wavApiService.createAxml(this.id(), dto));
  };

  private readonly executeCreate = (obs$: Observable<WavChunkDto>): void => {
    this.isSubmitting.set(true);
    this.error.set(null);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/wav', this.id()]);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.error.set(err.message);
      },
    });
  };
}