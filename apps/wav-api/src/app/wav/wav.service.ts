import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  WavFileDto,
  WavFileDetailDto,
  WavChunkDto,
  WavChunkDetailDto,
  ParsedChunkData,
  RenameWavFileDto,
} from '@shared-types';
import { PrismaService } from '../prisma';
import { WavValidatorService } from './wav-validator.service';
import { WavStorageService } from './wav-storage.service';
import { WavParserService } from './wav-parser.service';

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
export class WavService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: WavStorageService,
    private readonly validator: WavValidatorService,
    private readonly parser: WavParserService,
  ) {}

  async findAll(): Promise<WavFileDto[]> {
    const files = await this.prisma.wavFile.findMany({
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

  async upload(file: Express.Multer.File): Promise<WavFileDto> {
    let filePath: string | null = null;

    try {
      filePath = await this.storage.save(file);
      this.validator.validate(file);
      const chunks = this.parser.parse(file.buffer);

      const wavFile = await this.prisma.$transaction(async (tx) => {
        return tx.wavFile.create({
          data: {
            fileName: file.originalname,
            fileSize: file.size,
            filePath,
            chunks: {
              create: chunks.map((chunk) => ({
                chunkId: chunk.chunkId,
                offset: chunk.offset,
                payloadOffset: chunk.payloadOffset,
                size: chunk.size,
                isAudioData: chunk.isAudioData,
                rawData: chunk.rawData ? Buffer.from(chunk.rawData) : null,
              })),
            },
          },
        });
      });

      const fmtChunkResult = chunks.find((c) => c.chunkId === 'fmt ');
      const dataChunkResult = chunks.find((c) => c.isAudioData);
      const audioMeta = this.parseAudioMeta(
        fmtChunkResult?.rawData ?? null,
        dataChunkResult?.size ?? null,
      );

      return {
        id: wavFile.id,
        fileName: wavFile.fileName,
        fileSize: wavFile.fileSize,
        uploadedAt: wavFile.uploadedAt.toISOString(),
        chunkCount: chunks.length,
        ...audioMeta,
      };
    } catch (err) {
      if (filePath !== null) await this.storage.remove(filePath);
      throw err;
    }
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

  async renameFile(id: string, dto: RenameWavFileDto): Promise<WavFileDto> {
    const trimmed = dto.fileName.trim();
    if (!trimmed) {
      throw new BadRequestException('Název souboru nesmí být prázdný.');
    }
    if (!trimmed.toLowerCase().endsWith('.wav')) {
      throw new BadRequestException('Název souboru musí končit příponou .wav.');
    }
    if (trimmed.length > 255) {
      throw new BadRequestException('Název souboru nesmí překročit 255 znaků.');
    }

    const wavFile = await this.prisma.wavFile.findUnique({ where: { id } });
    if (!wavFile) {
      throw new NotFoundException(`WAV soubor s ID "${id}" nebyl nalezen.`);
    }

    const updated = await this.prisma.wavFile.update({
      where: { id },
      data: { fileName: trimmed },
      include: {
        _count: { select: { chunks: true } },
        chunks: {
          where: { OR: [{ chunkId: 'fmt ' }, { isAudioData: true }] },
          select: { chunkId: true, size: true, rawData: true, isAudioData: true },
        },
      },
    });

    const fmtChunk = updated.chunks.find((c) => c.chunkId === 'fmt ');
    const dataChunk = updated.chunks.find((c) => c.isAudioData);
    const audioMeta = this.parseAudioMeta(
      fmtChunk?.rawData ? Buffer.from(fmtChunk.rawData) : null,
      dataChunk?.size ?? null,
    );

    return {
      id: updated.id,
      fileName: updated.fileName,
      fileSize: updated.fileSize,
      uploadedAt: updated.uploadedAt.toISOString(),
      chunkCount: updated._count.chunks,
      ...audioMeta,
    };
  }

  async deleteById(id: string): Promise<void> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id },
      select: { id: true, filePath: true },
    });
    if (!wavFile) {
      throw new NotFoundException(`WAV soubor s ID "${id}" nebyl nalezen.`);
    }
    // WavChunk záznamy jsou smazány kaskádně (onDelete: Cascade)
    await this.prisma.wavFile.delete({ where: { id } });
    await this.storage.remove(wavFile.filePath);
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

  async deleteChunk(wavFileId: string, chunkDbId: string): Promise<void> {
    const chunk = await this.prisma.wavChunk.findFirst({
      where: { id: chunkDbId, wavFileId },
    });
    if (!chunk) {
      throw new NotFoundException(`Chunk s ID "${chunkDbId}" nebyl nalezen.`);
    }
    if (chunk.isAudioData) {
      throw new BadRequestException('Audio data chunk nelze smazat.');
    }
    await this.prisma.wavChunk.delete({ where: { id: chunkDbId } });
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
