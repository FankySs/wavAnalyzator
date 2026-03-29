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
  WavChunkDto,
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
  CreateAdtlDto,
} from '@shared-types';
import {
  serializeListInfo,
  serializeBext,
  serializeCue,
  serializeFact,
  serializeInst,
  serializeSmpl,
  serializeCart,
  serializeDisp,
  serializeXml,
  serializeAdtl,
} from '@riff-parser';
import { PrismaService } from '../prisma';

@Injectable()
export class WavChunkCreateService {
  constructor(private readonly prisma: PrismaService) {}

  async createListInfo(wavFileId: string, dto: CreateListInfoDto): Promise<WavChunkDto> {
    validateListInfoEntries(dto.entries);
    await this.assertChunkNotExists(wavFileId, 'LIST');
    return this.saveChunk(wavFileId, 'LIST', serializeListInfo(dto.entries));
  }

  async createBext(wavFileId: string, dto: CreateBextDto): Promise<WavChunkDto> {
    assertMaxLength(dto.description, 256, 'Popis');
    assertMaxLength(dto.originator, 32, 'Originátor');
    assertMaxLength(dto.originatorReference, 32, 'Reference originátu');
    assertDateField(dto.originationDate, 'Datum originátu');
    assertTimeField(dto.originationTime, 'Čas originátu');
    await this.assertChunkNotExists(wavFileId, 'bext');
    return this.saveChunk(wavFileId, 'bext', serializeBext(dto));
  }

  async createCue(wavFileId: string, dto: CreateCueDto): Promise<WavChunkDto> {
    await this.assertChunkNotExists(wavFileId, 'cue ');
    return this.saveChunk(wavFileId, 'cue ', serializeCue(dto));
  }

  async createFact(wavFileId: string, dto: CreateFactDto): Promise<WavChunkDto> {
    if (dto.sampleLength <= 0) {
      throw new BadRequestException('Délka vzorku musí být kladné číslo.');
    }
    await this.assertChunkNotExists(wavFileId, 'fact');
    return this.saveChunk(wavFileId, 'fact', serializeFact(dto.sampleLength));
  }

  async createInst(wavFileId: string, dto: CreateInstDto): Promise<WavChunkDto> {
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
    await this.assertChunkNotExists(wavFileId, 'inst');
    return this.saveChunk(wavFileId, 'inst', serializeInst(dto));
  }

  async createSmpl(wavFileId: string, dto: CreateSmplDto): Promise<WavChunkDto> {
    assertRange(dto.midiUnityNote, 0, 127, 'MIDI Unity Note');
    if (dto.loops) {
      for (const loop of dto.loops) {
        if (loop.type !== undefined) {
          assertRange(loop.type, 0, 2, 'Typ smyčky');
        }
        if (loop.end <= loop.start) {
          throw new BadRequestException('Konec smyčky musí být větší než začátek.');
        }
        if (loop.playCount !== undefined && loop.playCount < 0) {
          throw new BadRequestException('Počet přehrání smyčky nesmí být záporný.');
        }
      }
    }
    await this.assertChunkNotExists(wavFileId, 'smpl');
    return this.saveChunk(wavFileId, 'smpl', serializeSmpl(dto));
  }

  async createCart(wavFileId: string, dto: CreateCartDto): Promise<WavChunkDto> {
    assertMaxLength(dto.title, 64, 'Název');
    assertMaxLength(dto.artist, 64, 'Interpret');
    assertMaxLength(dto.category, 64, 'Kategorie');
    assertDateField(dto.startDate, 'Datum začátku');
    assertTimeField(dto.startTime, 'Čas začátku');
    assertDateField(dto.endDate, 'Datum konce');
    assertTimeField(dto.endTime, 'Čas konce');
    if (dto.url !== undefined) assertMaxLength(dto.url, 1024, 'URL');
    await this.assertChunkNotExists(wavFileId, 'cart');
    return this.saveChunk(wavFileId, 'cart', serializeCart(dto));
  }

  async createDisp(wavFileId: string, dto: CreateDispDto): Promise<WavChunkDto> {
    assertNotEmpty(dto.text, 'Text');
    assertMaxLength(dto.text, 500, 'Text');
    await this.assertChunkNotExists(wavFileId, 'DISP');
    return this.saveChunk(wavFileId, 'DISP', serializeDisp(dto.text));
  }

  async createIxml(wavFileId: string, dto: CreateIxmlDto): Promise<WavChunkDto> {
    await this.assertChunkNotExists(wavFileId, 'ixml');
    return this.saveChunk(wavFileId, 'ixml', serializeXml(dto.xml));
  }

  async createAxml(wavFileId: string, dto: CreateAxmlDto): Promise<WavChunkDto> {
    await this.assertChunkNotExists(wavFileId, 'axml');
    return this.saveChunk(wavFileId, 'axml', serializeXml(dto.xml));
  }

  async createAdtl(wavFileId: string, dto: CreateAdtlDto): Promise<WavChunkDto> {
    const listChunks = await this.prisma.wavChunk.findMany({
      where: { wavFileId, chunkId: 'LIST' },
      select: { rawData: true },
    });
    const hasAdtl = listChunks.some(
      (c) =>
        c.rawData &&
        Buffer.from(c.rawData).length >= 4 &&
        Buffer.from(c.rawData).toString('ascii', 0, 4) === 'adtl',
    );
    if (hasAdtl) {
      throw new BadRequestException("Chunk 'adtl' již existuje v tomto souboru.");
    }
    return this.saveChunk(wavFileId, 'LIST', serializeAdtl(dto.entries));
  }

  // -------------------------------------------------------------------------

  private async assertChunkNotExists(wavFileId: string, chunkId: string): Promise<void> {
    const existing = await this.prisma.wavChunk.findFirst({
      where: { wavFileId, chunkId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(`Chunk '${chunkId}' již existuje v tomto souboru.`);
    }
  }

  private async saveChunk(wavFileId: string, chunkId: string, rawData: Buffer): Promise<WavChunkDto> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id: wavFileId },
      select: { id: true },
    });
    if (!wavFile) {
      throw new NotFoundException(`WAV soubor "${wavFileId}" nebyl nalezen.`);
    }

    // Offset 0 = virtuální chunk (není součástí souboru na disku)
    const chunk = await this.prisma.wavChunk.create({
      data: {
        wavFileId,
        chunkId,
        offset: 0,
        payloadOffset: 8,
        size: rawData.length,
        isAudioData: false,
        rawData: Buffer.from(rawData),
      },
    });

    return {
      id: chunk.id,
      chunkId: chunk.chunkId,
      offset: chunk.offset,
      payloadOffset: chunk.payloadOffset,
      size: chunk.size,
      isAudioData: chunk.isAudioData,
    };
  }
}
