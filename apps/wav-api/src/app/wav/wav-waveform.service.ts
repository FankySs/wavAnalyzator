import * as fs from 'node:fs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { WaveformDto, WaveformPointDto } from '@shared-types';
import { PrismaService } from '../prisma';
import { WavParserService } from './wav-parser.service';

@Injectable()
export class WavWaveformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: WavParserService,
  ) {}

  // TODO: For large files (100MB+), consider streaming optimization instead of full buffer read
  async getWaveform(wavFileId: string, width: number): Promise<WaveformDto> {
    const wavFile = await this.prisma.wavFile.findUnique({
      where: { id: wavFileId },
      select: { id: true, filePath: true },
    });

    if (!wavFile) {
      throw new NotFoundException(`WAV soubor s ID "${wavFileId}" nebyl nalezen.`);
    }

    const dataChunk = await this.prisma.wavChunk.findFirst({
      where: { wavFileId, isAudioData: true },
      select: { payloadOffset: true, size: true },
    });

    if (!dataChunk) {
      throw new NotFoundException('Audio data chunk nebyl nalezen.');
    }

    const fmtChunk = await this.prisma.wavChunk.findFirst({
      where: { wavFileId, chunkId: 'fmt ' },
      select: { rawData: true },
    });

    if (!fmtChunk?.rawData) {
      throw new BadRequestException('fmt chunk nebyl nalezen – nelze sestavit waveform.');
    }

    const fmtParsed = this.parser.parseChunkData('fmt ', Buffer.from(fmtChunk.rawData));
    if (fmtParsed.chunkType !== 'fmt') {
      throw new BadRequestException('fmt chunk není platný.');
    }

    const { sampleRate, channels, bitsPerSample, byteRate } = fmtParsed;
    const durationSec = byteRate > 0 ? dataChunk.size / byteRate : 0;

    const buffer = Buffer.alloc(dataChunk.size);
    const fd = fs.openSync(wavFile.filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, dataChunk.size, dataChunk.payloadOffset);
    } finally {
      fs.closeSync(fd);
    }

    const bytesPerSample = Math.ceil(bitsPerSample / 8);
    const frameCount = Math.floor(buffer.length / (bytesPerSample * channels));
    const monoSamples = new Float32Array(frameCount);

    for (let i = 0; i < frameCount; i++) {
      let sum = 0;
      for (let ch = 0; ch < channels; ch++) {
        const offset = (i * channels + ch) * bytesPerSample;
        sum += this.readSample(buffer, offset, bitsPerSample);
      }
      monoSamples[i] = sum / channels;
    }

    const points: WaveformPointDto[] = [];
    const samplesPerBucket = frameCount / width;

    for (let b = 0; b < width; b++) {
      const startIdx = Math.floor(b * samplesPerBucket);
      const endIdx = Math.min(Math.floor((b + 1) * samplesPerBucket), frameCount);

      let min = 0;
      let max = 0;

      for (let s = startIdx; s < endIdx; s++) {
        const v = monoSamples[s];
        if (v < min) min = v;
        if (v > max) max = v;
      }

      points.push({ min, max });
    }

    return { points, durationSec, sampleRate };
  }

  private readSample(buffer: Buffer, offset: number, bitsPerSample: number): number {
    switch (bitsPerSample) {
      case 8:
        return (buffer.readUInt8(offset) - 128) / 128;
      case 16:
        return buffer.readInt16LE(offset) / 32768;
      case 24: {
        let value =
          (buffer[offset + 2] << 16) | (buffer[offset + 1] << 8) | buffer[offset];
        if (value & 0x800000) value -= 0x1000000;
        return value / 8388608;
      }
      case 32:
        return buffer.readInt32LE(offset) / 2147483648;
      default:
        return 0;
    }
  }
}