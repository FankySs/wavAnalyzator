import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { WaveformDto, WaveformPointDto } from '@shared-types';
import { PrismaService } from '../prisma';
import { WavParserService } from './wav-parser.service';
import { R2StorageService } from './r2-storage.service';

@Injectable()
export class WavWaveformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: WavParserService,
    private readonly r2: R2StorageService,
  ) {}

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

    const buffer = await this.r2.downloadFileRange(
      wavFile.filePath,
      dataChunk.payloadOffset,
      dataChunk.payloadOffset + dataChunk.size - 1,
    );

    const bytesPerSample = Math.ceil(bitsPerSample / 8);
    const frameCount = Math.floor(buffer.length / (bytesPerSample * channels));

    // Downmix to mono by averaging channels — waveform is always shown as a single bar
    const monoSamples = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      let sum = 0;
      for (let ch = 0; ch < channels; ch++) {
        const offset = (i * channels + ch) * bytesPerSample;
        sum += this.readSample(buffer, offset, bitsPerSample);
      }
      monoSamples[i] = sum / channels;
    }

    // Each bucket = min + max amplitude of its segment; preserves peaks better than averaging
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