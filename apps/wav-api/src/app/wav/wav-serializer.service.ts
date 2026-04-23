import { Injectable, NotFoundException } from '@nestjs/common';
import { serializeWav, type WavChunkRecord } from '@riff-parser';
import { PrismaService } from '../prisma';
import { R2StorageService } from './r2-storage.service';

@Injectable()
export class WavSerializerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2StorageService,
  ) {}

  async buildWavBuffer(wavFileId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id: wavFileId },
      select: { filePath: true, fileName: true },
    });
    if (!wavFile) {
      throw new NotFoundException(`WAV soubor "${wavFileId}" nebyl nalezen.`);
    }

    const chunks = await this.prisma.wavChunk.findMany({
      where: { wavFileId },
      orderBy: { offset: 'asc' },
    });

    // Audio data chunk is not stored in DB (too large). Fetch it as a range from storage.
    const records: WavChunkRecord[] = await Promise.all(
      chunks.map(async (c) => {
        if (c.isAudioData) {
          const audioBuffer = await this.r2.downloadFileRange(
            wavFile.filePath,
            c.payloadOffset,
            c.payloadOffset + c.size - 1,
          );
          return { chunkId: c.chunkId, rawData: audioBuffer, isAudioData: true, offset: c.offset };
        }
        return {
          chunkId: c.chunkId,
          rawData: c.rawData ? Buffer.from(c.rawData) : null,
          isAudioData: false,
          offset: c.offset,
        };
      }),
    );

    const buffer = serializeWav(records);
    return { buffer, fileName: wavFile.fileName };
  }
}