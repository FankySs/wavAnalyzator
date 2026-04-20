import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  assertMaxLength,
  assertNotEmpty,
  assertRange,
  assertDateField,
  assertTimeField,
  validateListInfoEntries,
} from './wav-validation.helpers';
import type {
  WavChunkDetailDto,
  UpdateListInfoDto,
  UpdateBextDto,
  UpdateCueDto,
  UpdateSmplDto,
  UpdateInstDto,
  UpdateFactDto,
  UpdatePeakDto,
  UpdateDispDto,
  UpdateUmidDto,
  UpdateCartDto,
  UpdateIxmlDto,
  UpdateAxmlDto,
  UpdateAdtlDto,
  UpdateMextDto,
  UpdateLevlDto,
  CreateInfoEntryDto,
} from '@shared-types';
import {
  serializeListInfo,
  serializeBextUpdate,
  serializeCue,
  serializeSmplUpdate,
  serializeInst,
  serializeFact,
  serializePeak,
  serializeDisp,
  serializeUmid,
  serializeCartUpdate,
  serializeXml,
  serializeAdtl,
  serializeMext,
  serializeLevlHeader,
  type ListInfoEntry,
} from '@riff-parser';
import { PrismaService } from '../prisma';
import { WavParserService } from './wav-parser.service';

@Injectable()
export class WavChunkUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: WavParserService,
  ) {}

  async updateListInfo(chunkDbId: string, dto: UpdateListInfoDto): Promise<WavChunkDetailDto> {
    validateListInfoEntries(dto.entries);
    await this.loadChunk(chunkDbId, 'LIST');

    const newRawData = serializeListInfo(dto.entries);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  async updateBext(chunkDbId: string, dto: UpdateBextDto): Promise<WavChunkDetailDto> {
    assertMaxLength(dto.description, 256, 'Popis');
    assertMaxLength(dto.originator, 32, 'Originátor');
    assertMaxLength(dto.originatorReference, 32, 'Reference originátu');
    assertDateField(dto.originationDate, 'Datum originátu');
    assertTimeField(dto.originationTime, 'Čas originátu');
    assertMaxLength(dto.codingHistory, 1024, 'Historie kódování');
    const chunk = await this.loadChunk(chunkDbId, 'bext');
    const existingRaw = chunk.rawData ? Buffer.from(chunk.rawData) : undefined;
    const newRawData = serializeBextUpdate(dto, existingRaw);

    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  async updateCue(chunkDbId: string, dto: UpdateCueDto): Promise<WavChunkDetailDto> {
    await this.loadChunk(chunkDbId, 'cue ');
    const newRawData = serializeCue(dto);

    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  async updateSmpl(chunkDbId: string, dto: UpdateSmplDto): Promise<WavChunkDetailDto> {
    assertRange(dto.midiUnityNote, 0, 127, 'MIDI Unity Note');
    for (const loop of dto.loops) {
      assertRange(loop.type, 0, 2, 'Typ smyčky');
      if (loop.end <= loop.start) {
        throw new BadRequestException('Konec smyčky musí být větší než začátek.');
      }
      if (loop.playCount < 0) {
        throw new BadRequestException('Počet přehrání smyčky nesmí být záporný.');
      }
    }
    await this.loadChunk(chunkDbId, 'smpl');
    const newRawData = serializeSmplUpdate(dto);

    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  async updateInst(chunkDbId: string, dto: UpdateInstDto): Promise<WavChunkDetailDto> {
    assertRange(dto.unshiftedNote, 0, 127, 'Základní nota');
    assertRange(dto.fineTune, -50, 50, 'Jemné ladění');
    assertRange(dto.gain, -64, 64, 'Zesílení');
    assertRange(dto.lowNote, 0, 127, 'Nejnižší nota');
    assertRange(dto.highNote, 0, 127, 'Nejvyšší nota');
    assertRange(dto.lowVelocity, 0, 127, 'Nejnižší velocity');
    assertRange(dto.highVelocity, 0, 127, 'Nejvyšší velocity');
    if (dto.lowNote > dto.highNote) {
      throw new BadRequestException('Nejnižší nota nesmí být větší než nejvyšší nota.');
    }
    if (dto.lowVelocity > dto.highVelocity) {
      throw new BadRequestException('Nejnižší velocity nesmí být větší než nejvyšší velocity.');
    }
    await this.loadChunk(chunkDbId, 'inst');
    const newRawData = serializeInst(dto);

    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  async updateFact(chunkDbId: string, dto: UpdateFactDto): Promise<WavChunkDetailDto> {
    if (dto.sampleLength <= 0) {
      throw new BadRequestException('Délka vzorku musí být kladné číslo.');
    }
    await this.loadChunk(chunkDbId, 'fact');
    const newRaw = serializeFact(dto.sampleLength);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updatePeak(chunkDbId: string, dto: UpdatePeakDto): Promise<WavChunkDetailDto> {
    for (const ch of dto.channels) {
      assertRange(ch.value, 0.0, 1.0, 'Hodnota kanálu');
      if (ch.position < 0) {
        throw new BadRequestException('Pozice vzorku nesmí být záporná.');
      }
    }
    const chunk = await this.loadChunk(chunkDbId, 'PEAK');
    const existing = chunk.rawData ? Buffer.from(chunk.rawData) : null;
    const version = existing && existing.length >= 8 ? existing.readUInt32LE(0) : 1;
    const timeStamp = existing && existing.length >= 8 ? existing.readUInt32LE(4) : 0;
    const newRaw = serializePeak(dto, version, timeStamp);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateDisp(chunkDbId: string, dto: UpdateDispDto): Promise<WavChunkDetailDto> {
    assertNotEmpty(dto.text, 'Text');
    assertMaxLength(dto.text, 500, 'Text');
    await this.loadChunk(chunkDbId, 'DISP');
    const newRaw = serializeDisp(dto.text);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateUmid(chunkDbId: string, dto: UpdateUmidDto): Promise<WavChunkDetailDto> {
    await this.loadChunk(chunkDbId, 'umid');
    if (!/^[0-9A-Fa-f]{128}$/.test(dto.umid)) {
      throw new BadRequestException('UMID musí být 128 hex znaků (64 bajtů).');
    }
    const newRaw = serializeUmid(dto.umid);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateAdtl(chunkDbId: string, dto: UpdateAdtlDto): Promise<WavChunkDetailDto> {
    const chunk = await this.loadChunk(chunkDbId, 'LIST');
    const rawData = chunk.rawData ? Buffer.from(chunk.rawData) : null;
    if (!rawData || rawData.length < 4 || rawData.toString('ascii', 0, 4) !== 'adtl') {
      throw new BadRequestException('Chunk není adtl LIST.');
    }
    const newRaw = serializeAdtl(dto.entries);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateMext(chunkDbId: string, dto: UpdateMextDto): Promise<WavChunkDetailDto> {
    await this.loadChunk(chunkDbId, 'mext');
    const newRaw = serializeMext(dto);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateLevl(chunkDbId: string, dto: UpdateLevlDto): Promise<WavChunkDetailDto> {
    const chunk = await this.loadChunk(chunkDbId, 'levl');
    if (!chunk.rawData || chunk.rawData.length < 24) {
      throw new BadRequestException('levl chunk neobsahuje dostatečná data hlavičky.');
    }
    const existing = Buffer.from(chunk.rawData);
    const newRaw = serializeLevlHeader(dto, existing);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateCart(chunkDbId: string, dto: UpdateCartDto): Promise<WavChunkDetailDto> {
    assertMaxLength(dto.title, 64, 'Název');
    assertMaxLength(dto.artist, 64, 'Interpret');
    assertMaxLength(dto.cutId, 64, 'Cut ID');
    assertMaxLength(dto.clientId, 64, 'Client ID');
    assertMaxLength(dto.category, 64, 'Kategorie');
    assertMaxLength(dto.classification, 64, 'Klasifikace');
    assertMaxLength(dto.outCue, 64, 'Out Cue');
    assertDateField(dto.startDate, 'Datum začátku');
    assertTimeField(dto.startTime, 'Čas začátku');
    assertDateField(dto.endDate, 'Datum konce');
    assertTimeField(dto.endTime, 'Čas konce');
    assertMaxLength(dto.producerAppId, 64, 'ID aplikace producenta');
    assertMaxLength(dto.producerAppVersion, 64, 'Verze aplikace producenta');
    assertMaxLength(dto.userDef, 64, 'Uživatelská definice');
    assertMaxLength(dto.url, 1024, 'URL');
    assertMaxLength(dto.tag, 300, 'Tag');
    await this.loadChunk(chunkDbId, 'cart');
    const newRaw = serializeCartUpdate(dto);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateIxml(chunkDbId: string, dto: UpdateIxmlDto): Promise<WavChunkDetailDto> {
    await this.loadChunk(chunkDbId, ['ixml', 'iXML']);
    const newRaw = serializeXml(dto.xml);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async updateAxml(chunkDbId: string, dto: UpdateAxmlDto): Promise<WavChunkDetailDto> {
    await this.loadChunk(chunkDbId, 'axml');
    const newRaw = serializeXml(dto.xml);
    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRaw), size: newRaw.length },
    });
    return this.buildDetail(chunkDbId);
  }

  async addInfoEntry(chunkDbId: string, dto: CreateInfoEntryDto): Promise<WavChunkDetailDto> {
    this.validateEntryId(dto.id);
    this.validateEntryValue(dto.value);

    const chunk = await this.loadListChunkWithRawData(chunkDbId);
    const parsed = this.parser.parseChunkData('LIST', Buffer.from(chunk.rawData!));
    const currentEntries =
      parsed.chunkType === 'LIST_INFO' ? parsed.entries : [];

    if (currentEntries.some((e) => e.id === dto.id)) {
      throw new BadRequestException(`Duplicitní tag ID: "${dto.id}".`);
    }

    const newEntries: ListInfoEntry[] = [...currentEntries, { id: dto.id, value: dto.value }];
    const newRawData = serializeListInfo(newEntries);

    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  async deleteInfoEntry(chunkDbId: string, tagId: string): Promise<WavChunkDetailDto> {
    const chunk = await this.loadListChunkWithRawData(chunkDbId);

    const parsed = this.parser.parseChunkData('LIST', Buffer.from(chunk.rawData!));
    const currentEntries =
      parsed.chunkType === 'LIST_INFO' ? parsed.entries : [];

    const newEntries = currentEntries.filter((e) => e.id !== tagId);
    const newRawData = serializeListInfo(newEntries);

    await this.prisma.wavChunk.update({
      where: { id: chunkDbId },
      data: { rawData: Buffer.from(newRawData), size: newRawData.length },
    });

    return this.buildDetail(chunkDbId);
  }

  // -------------------------------------------------------------------------

  /** Načte chunk z DB a ověří, že má očekávaný 4CC identifikátor.
   *  Přijímá i pole aliasů pro chunk IDs kde spec připouští více variant (např. ixml / iXML). */
  private async loadChunk(chunkDbId: string, expectedChunkId: string | string[]) {
    const chunk = await this.prisma.wavChunk.findUnique({ where: { id: chunkDbId } });
    if (!chunk) throw new NotFoundException(`Chunk "${chunkDbId}" nebyl nalezen.`);
    const allowed = Array.isArray(expectedChunkId) ? expectedChunkId : [expectedChunkId];
    if (!allowed.includes(chunk.chunkId)) {
      throw new BadRequestException(
        `Očekáván chunk '${allowed[0]}', nalezen '${chunk.chunkId}'.`,
      );
    }
    return chunk;
  }

  /** Načte LIST chunk a navíc ověří, že obsahuje rawData (nutné pro parsování). */
  private async loadListChunkWithRawData(chunkDbId: string) {
    const chunk = await this.loadChunk(chunkDbId, 'LIST');
    if (!chunk.rawData) {
      throw new BadRequestException('LIST chunk neobsahuje žádná data.');
    }
    return chunk;
  }

  private async buildDetail(chunkDbId: string): Promise<WavChunkDetailDto> {
    const chunk = await this.prisma.wavChunk.findUnique({ where: { id: chunkDbId } });
    if (!chunk) throw new NotFoundException(`Chunk "${chunkDbId}" nebyl nalezen.`);

    const parsed = chunk.rawData
      ? this.parser.parseChunkData(chunk.chunkId, Buffer.from(chunk.rawData))
      : null;

    return {
      id: chunk.id,
      chunkId: chunk.chunkId,
      offset: chunk.offset,
      payloadOffset: chunk.payloadOffset,
      size: chunk.size,
      isAudioData: chunk.isAudioData,
      parsed,
    };
  }

  private validateEntryId(id: string): void {
    if (id.length !== 4) {
      throw new BadRequestException(`Tag ID musí mít přesně 4 znaky, obdrženo: "${id}".`);
    }
  }

  private validateEntryValue(value: string): void {
    if (!value.trim()) {
      throw new BadRequestException('Hodnota tagu nesmí být prázdná.');
    }
    if (value.length > 500) {
      throw new BadRequestException('Hodnota tagu nesmí překročit 500 znaků.');
    }
  }
}