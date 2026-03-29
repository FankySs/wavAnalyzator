import { Component, WritableSignal, computed, input, output, signal } from '@angular/core';
import type { CreateInfoEntryDto, CreateListInfoDto } from '@shared-types';
import { INFO_TAGS, type InfoTag } from '../../../../utils/info-tags';

@Component({
  selector: 'app-list-info-create',
  standalone: true,
  templateUrl: './list-info-create.component.html',
  imports: [],
})
export class ListInfoCreateComponent {
  readonly isDisabled = input<boolean>(false);
  readonly submitted = output<CreateListInfoDto>();
  readonly cancelled = output<void>();

  protected readonly infoTags: InfoTag[] = INFO_TAGS;

  protected readonly entries: WritableSignal<CreateInfoEntryDto[]> = signal([
    { id: 'INAM', value: '' },
    { id: 'IART', value: '' },
    { id: 'IPRD', value: '' },
    { id: 'ICRD', value: '' },
  ]);

  protected readonly charCounts = computed(() => this.entries().map((e) => e.value.length));
  protected readonly formError: WritableSignal<string | null> = signal(null);

  protected readonly addEntry = (): void => {
    this.entries.update((e) => [...e, { id: 'INAM', value: '' }]);
  };

  protected readonly removeEntry = (index: number): void => {
    this.entries.update((e) => e.filter((_, i) => i !== index));
  };

  protected readonly updateEntry = (index: number, field: 'id' | 'value', val: string): void => {
    this.entries.update((e) =>
      e.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  protected readonly onSubmit = (): void => {
    const entries = this.entries();
    const emptyEntry = entries.find((e) => !e.value.trim());
    if (emptyEntry) {
      this.formError.set(`Hodnota tagu "${emptyEntry.id}" nesmí být prázdná.`);
      return;
    }
    const longEntry = entries.find((e) => e.value.length > 500);
    if (longEntry) {
      this.formError.set(`Hodnota tagu "${longEntry.id}" překračuje 500 znaků.`);
      return;
    }
    this.formError.set(null);
    this.submitted.emit({ entries });
  };

  protected readonly onCancel = (): void => {
    this.cancelled.emit();
  };
}