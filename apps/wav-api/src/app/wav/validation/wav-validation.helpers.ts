import { BadRequestException } from '@nestjs/common';

export function assertMaxLength(value: string, max: number, fieldName: string): void {
  if (value.length > max) {
    throw new BadRequestException(`${fieldName} nesmí být delší než ${max} znaků.`);
  }
}

export function assertNotEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new BadRequestException(`${fieldName} nesmí být prázdné.`);
  }
}

export function assertRange(value: number, min: number, max: number, fieldName: string): void {
  if (value < min || value > max) {
    throw new BadRequestException(`${fieldName} musí být v rozsahu ${min}–${max}.`);
  }
}

export function assertPattern(value: string, pattern: RegExp, fieldName: string, hint: string): void {
  if (value && !pattern.test(value)) {
    throw new BadRequestException(`${fieldName} musí mít formát ${hint}.`);
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}:\d{2}$/;

export function assertDateField(value: string, fieldName: string): void {
  assertPattern(value, DATE_PATTERN, fieldName, 'YYYY-MM-DD');
}

export function assertTimeField(value: string, fieldName: string): void {
  assertPattern(value, TIME_PATTERN, fieldName, 'HH:MM:SS');
}

export function validateListInfoEntries(entries: { id: string; value: string }[]): void {
  if (!entries || entries.length === 0) {
    throw new BadRequestException('Pole entries nesmí být prázdné.');
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.id.length !== 4) {
      throw new BadRequestException(`Tag ID musí mít přesně 4 znaky, obdrženo: "${entry.id}".`);
    }
    if (seen.has(entry.id)) {
      throw new BadRequestException(`Duplicitní tag ID: "${entry.id}".`);
    }
    seen.add(entry.id);
    if (!entry.value || entry.value.trim().length === 0) {
      throw new BadRequestException(`Hodnota tagu "${entry.id}" nesmí být prázdná.`);
    }
    if (entry.value.length > 500) {
      throw new BadRequestException(`Hodnota tagu "${entry.id}" nesmí překročit 500 znaků.`);
    }
  }
}