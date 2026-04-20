import type { WavChunkDto } from './wav-chunk.dto';

export type WavFileDto = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string; // ISO 8601
  chunkCount: number;
  // Audio metadata z fmt chunku (null pokud fmt není k dispozici)
  channels: number | null;
  sampleRate: number | null;
  bitsPerSample: number | null;
  durationSec: number | null;
};

export type WavFileListDto = WavFileDto[];

export type WavFileDetailDto = WavFileDto & {
  chunks: WavChunkDto[];
};

export type RenameWavFileDto = {
  fileName: string; // musí končit .wav, max 255 znaků
};
