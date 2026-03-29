import { Injectable, NotFoundException } from '@nestjs/common';
import { serializeWav, type WavChunkRecord } from '@riff-parser';
import { PrismaService } from '../prisma';

@Injectable()
export class WavSerializerService {
  constructor(private readonly prisma: PrismaService) {}

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

    const records: WavChunkRecord[] = chunks.map((c) => ({
      chunkId: c.chunkId,
      rawData: c.rawData ? Buffer.from(c.rawData) : null,
      isAudioData: c.isAudioData,
      offset: c.offset,
      filePath: c.isAudioData ? wavFile.filePath : undefined,
      dataOffset: c.isAudioData ? c.payloadOffset : undefined,
      dataSize: c.isAudioData ? c.size : undefined,
    }));

    const buffer = serializeWav(records);
    return { buffer, fileName: wavFile.fileName };
  }
}