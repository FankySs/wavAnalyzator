import {
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  WavChunkDetailDto,
  UpdateListInfoDto,
  CreateInfoEntryDto,
} from '@shared-types';
import { WavApiService } from '../../../../services/wav-api.service';
import { ConfirmInlineComponent } from '../../../../components/confirm-inline/confirm-inline.component';
import { INFO_TAGS, INFO_TAG_MAP, type InfoTag } from '../../../../utils/info-tags';

type EditEntry = { id: string; value: string };

@Component({
  selector: 'app-list-info-detail',
  standalone: true,
  templateUrl: './list-info-detail.component.html',
  styleUrls: ['./list-info-detail.component.css'],
  imports: [ConfirmInlineComponent],
})
export class ListInfoDetailComponent {
  private readonly wavApiService = inject(WavApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chunk = input.required<WavChunkDetailDto>();
  readonly wavId = input.required<string>();

  // Server-side state, updated after each successful API call
  protected readonly liveChunk: WritableSignal<WavChunkDetailDto | null> = signal(null);

  protected readonly isEditing: WritableSignal<boolean> = signal(false);
  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  readonly savingChange = output<boolean>();
  protected readonly saveError: WritableSignal<string | null> = signal(null);

  // Local editable copy of entries (diverges from liveChunk while editing)
  protected readonly editEntries: WritableSignal<EditEntry[]> = signal([]);

  // Inline "add new tag" sub-form
  protected readonly isAddingTag: WritableSignal<boolean> = signal(false);
  protected readonly newTagId: WritableSignal<string> = signal('INAM');
  protected readonly newTagValue: WritableSignal<string> = signal('');
  protected readonly isPosting: WritableSignal<boolean> = signal(false);
  protected readonly postError: WritableSignal<string | null> = signal(null);

  // Per-tag delete confirm (keyed by 4CC)
  protected readonly pendingDeleteTagId: WritableSignal<string | null> = signal(null);
  protected readonly isDeletingTag: WritableSignal<boolean> = signal(false);

  protected readonly infoTags: InfoTag[] = INFO_TAGS;

  protected readonly entries = computed(() => {
    const parsed = this.liveChunk()?.parsed;
    return parsed?.chunkType === 'LIST_INFO' ? parsed.entries : [];
  });

  protected readonly newTagDescription = computed(
    () => INFO_TAG_MAP[this.newTagId()]?.description ?? '',
  );

  constructor() {
    effect(() => {
      const c = this.chunk();
      this.liveChunk.set(c);
      this.applyLiveToEditState(c);
    });
  }

  // -------------------------------------------------------------------------

  protected tagName(id: string): string {
    return INFO_TAG_MAP[id]?.name ?? id.trim();
  }

  protected tagFullDesc(id: string): string {
    return INFO_TAG_MAP[id]?.description ?? '';
  }

  protected readonly onEditClick = (): void => {
    const c = this.liveChunk();
    if (!c) return;
    this.applyLiveToEditState(c);
    this.saveError.set(null);
    this.isEditing.set(true);
  };

  protected readonly onCancelClick = (): void => {
    const c = this.liveChunk();
    if (c) this.applyLiveToEditState(c);
    this.isEditing.set(false);
    this.saveError.set(null);
    this.isAddingTag.set(false);
    this.newTagValue.set('');
    this.pendingDeleteTagId.set(null);
  };

  protected readonly updateEditEntry = (index: number, value: string): void => {
    this.editEntries.update((es) =>
      es.map((e, i) => (i === index ? { ...e, value } : e)),
    );
  };

  protected readonly onNewTagIdChange = (value: string): void => {
    this.newTagId.set(value);
  };

  protected readonly onNewTagValueChange = (value: string): void => {
    this.newTagValue.set(value);
  };

  protected readonly onSaveClick = (): void => {
    const dto: UpdateListInfoDto = { entries: this.editEntries() };
    this.isSaving.set(true);
    this.savingChange.emit(true);
    this.saveError.set(null);
    this.wavApiService
      .updateListInfo(this.wavId(), this.chunk().id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.liveChunk.set(updated);
          this.applyLiveToEditState(updated);
          this.isEditing.set(false);
          this.isAddingTag.set(false);
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

  // Delete tag

  protected readonly onDeleteTagRequest = (tagId: string): void => {
    this.pendingDeleteTagId.set(tagId);
  };

  protected readonly onDeleteTagCancel = (): void => {
    this.pendingDeleteTagId.set(null);
  };

  protected readonly onDeleteTagConfirm = (): void => {
    const tagId = this.pendingDeleteTagId();
    if (!tagId) return;

    this.isDeletingTag.set(true);
    this.wavApiService
      .deleteInfoEntry(this.wavId(), this.chunk().id, tagId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.liveChunk.set(updated);
          this.editEntries.update((es) => es.filter((e) => e.id !== tagId));
          this.isDeletingTag.set(false);
          this.pendingDeleteTagId.set(null);
        },
        error: (err: Error) => {
          this.saveError.set(err.message);
          this.isDeletingTag.set(false);
          this.pendingDeleteTagId.set(null);
        },
      });
  };

  // Add tag

  protected readonly onShowAddTag = (): void => {
    this.isAddingTag.set(true);
    this.newTagValue.set('');
    this.postError.set(null);
  };

  protected readonly onCancelAddTag = (): void => {
    this.isAddingTag.set(false);
    this.newTagValue.set('');
    this.postError.set(null);
  };

  protected readonly onAddTag = (): void => {
    const value = this.newTagValue().trim();
    if (!value) return;

    const tagId = this.newTagId();
    const dto: CreateInfoEntryDto = { id: tagId, value };

    this.isPosting.set(true);
    this.postError.set(null);
    this.wavApiService
      .addInfoEntry(this.wavId(), this.chunk().id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.liveChunk.set(updated);
          this.editEntries.update((es) => [...es, { id: tagId, value }]);
          this.isPosting.set(false);
          this.isAddingTag.set(false);
          this.newTagValue.set('');
        },
        error: (err: Error) => {
          this.postError.set(err.message);
          this.isPosting.set(false);
        },
      });
  };

  // -------------------------------------------------------------------------

  private applyLiveToEditState(c: WavChunkDetailDto): void {
    const parsed = c.parsed;
    const entries = parsed?.chunkType === 'LIST_INFO' ? parsed.entries : [];
    this.editEntries.set(entries.map((e) => ({ id: e.id, value: e.value })));
  }
}