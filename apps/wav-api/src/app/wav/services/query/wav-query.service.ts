import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  WavFileDto,
  WavFileDetailDto,
  WavChunkDto,
  WavChunkDetailDto,
  ParsedChunkData,
} from '@shared-types';
import { PrismaService } from '../../../prisma';
import { WavParserService } from '../io/wav-parser.service';

export interface WavFindAllParams {
  name?: string;
  dateFrom?: string;
  dateTo?: string;
  chunkTypes?: string[];
}

function toWavChunkDto(chunk: {
  id: string;
  chunkId: string;
  offset: number;
  payloadOffset: number;
  size: number;
  isAudioData: boolean;
}): WavChunkDto {
  return {
    id: chunk.id,
    chunkId: chunk.chunkId,
    offset: chunk.offset,
    payloadOffset: chunk.payloadOffset,
    size: chunk.size,
    isAudioData: chunk.isAudioData,
  };
}

@Injectable()
export class WavQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: WavParserService,
  ) {}

  async findAll(params: WavFindAllParams = {}): Promise<WavFileDto[]> {
    const { name, dateFrom, dateTo, chunkTypes } = params;
    const files = await this.prisma.wavFile.findMany({
      where: {
        ...(name ? { fileName: { contains: name } } : {}),
        ...(dateFrom || dateTo
          ? {
              uploadedAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
        ...(chunkTypes?.length ? { chunks: { some: { chunkId: { in: chunkTypes } } } } : {}),
      },
      include: {
        _count: { select: { chunks: true } },
        chunks: {
          where: { OR: [{ chunkId: 'fmt ' }, { isAudioData: true }] },
          select: { chunkId: true, size: true, rawData: true, isAudioData: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return files.map((file) => {
      const fmtChunk = file.chunks.find((c) => c.chunkId === 'fmt ');
      const dataChunk = file.chunks.find((c) => c.isAudioData);
      const audioMeta = this.parseAudioMeta(
        fmtChunk?.rawData ? Buffer.from(fmtChunk.rawData) : null,
        dataChunk?.size ?? null,
      );
      return {
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        uploadedAt: file.uploadedAt.toISOString(),
        chunkCount: file._count.chunks,
        ...audioMeta,
      };
    });
  }

  async findById(id: string): Promise<WavFileDetailDto> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            chunkId: true,
            offset: true,
            payloadOffset: true,
            size: true,
            isAudioData: true,
          },
          orderBy: { offset: 'asc' },
        },
      },
    });

    if (!wavFile) {
      throw new NotFoundException(`WAV soubor s ID "${id}" nebyl nalezen.`);
    }

    // Separate query for fmt rawData (not included in chunks select above)
    const fmtChunk = await this.prisma.wavChunk.findFirst({
      where: { wavFileId: id, chunkId: 'fmt ' },
      select: { rawData: true },
    });
    const dataChunk = wavFile.chunks.find((c) => c.isAudioData);
    const audioMeta = this.parseAudioMeta(
      fmtChunk?.rawData ? Buffer.from(fmtChunk.rawData) : null,
      dataChunk?.size ?? null,
    );

    return {
      id: wavFile.id,
      fileName: wavFile.fileName,
      fileSize: wavFile.fileSize,
      uploadedAt: wavFile.uploadedAt.toISOString(),
      chunkCount: wavFile.chunks.length,
      ...audioMeta,
      chunks: wavFile.chunks.map(toWavChunkDto),
    };
  }

  async findChunks(wavFileId: string): Promise<WavChunkDto[]> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id: wavFileId },
      select: { id: true },
    });

    if (!wavFile) {
      throw new NotFoundException(`WAV soubor s ID "${wavFileId}" nebyl nalezen.`);
    }

    const chunks = await this.prisma.wavChunk.findMany({
      where: { wavFileId },
      select: {
        id: true,
        chunkId: true,
        offset: true,
        payloadOffset: true,
        size: true,
        isAudioData: true,
      },
      orderBy: { offset: 'asc' },
    });

    return chunks.map(toWavChunkDto);
  }

  async findChunkDetail(wavFileId: string, chunkDbId: string): Promise<WavChunkDetailDto> {
    const chunk = await this.prisma.wavChunk.findFirst({
      where: { id: chunkDbId, wavFileId },
    });

    if (!chunk) {
      throw new NotFoundException(`Chunk s ID "${chunkDbId}" nebyl nalezen.`);
    }

    let parsed: ParsedChunkData | null = null;
    if (!chunk.isAudioData) {
      if (chunk.rawData) {
        parsed = this.parser.parseChunkData(chunk.chunkId, Buffer.from(chunk.rawData));
      } else {
        parsed = this.parser.parsePaddingChunk(chunk.chunkId, chunk.size);
      }
    }

    return {
      ...toWavChunkDto(chunk),
      parsed,
    };
  }

  async getFileInfo(id: string): Promise<{ storageKey: string; fileName: string; fileSize: number }> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id },
      select: { filePath: true, fileName: true, fileSize: true },
    });
    if (!wavFile) {
      throw new NotFoundException(`WAV soubor s ID "${id}" nebyl nalezen.`);
    }
    return { storageKey: wavFile.filePath, fileName: wavFile.fileName, fileSize: wavFile.fileSize };
  }

  async findChunkRawData(wavFileId: string, chunkDbId: string): Promise<Buffer> {
    const chunk = await this.prisma.wavChunk.findFirst({
      where: { id: chunkDbId, wavFileId },
      select: { rawData: true, isAudioData: true, chunkId: true, size: true },
    });

    if (!chunk) {
      throw new NotFoundException(`Chunk s ID "${chunkDbId}" nebyl nalezen.`);
    }
    if (chunk.isAudioData) {
      throw new BadRequestException('Audio data chunk nelze exportovat přímým endpointem. Použij /stream.');
    }

    const header4cc = Buffer.alloc(4);
    Buffer.from(chunk.chunkId, 'ascii').copy(header4cc, 0, 0, 4);

    const headerSize = Buffer.alloc(4);
    headerSize.writeUInt32LE(chunk.size, 0);

    return Buffer.concat([header4cc, headerSize, chunk.rawData ? Buffer.from(chunk.rawData) : Buffer.alloc(0)]);
  }

  // -------------------------------------------------------------------------

  private parseAudioMeta(
    fmtRawData: Buffer | null,
    dataChunkSize: number | null,
  ): {
    channels: number | null;
    sampleRate: number | null;
    bitsPerSample: number | null;
    durationSec: number | null;
  } {
    if (!fmtRawData) {
      return { channels: null, sampleRate: null, bitsPerSample: null, durationSec: null };
    }
    const parsed = this.parser.parseChunkData('fmt ', fmtRawData);
    if (parsed.chunkType !== 'fmt') {
      return { channels: null, sampleRate: null, bitsPerSample: null, durationSec: null };
    }
    return {
      channels: parsed.channels,
      sampleRate: parsed.sampleRate,
      bitsPerSample: parsed.bitsPerSample,
      durationSec:
        dataChunkSize !== null && parsed.byteRate > 0
          ? dataChunkSize / parsed.byteRate
          : null,
    };
  }
}