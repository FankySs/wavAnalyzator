import { readFileSync } from 'fs';

export type WavChunkRecord = {
  chunkId: string;
  rawData: Buffer | null;
  isAudioData: boolean;
  offset: number;
  filePath?: string;
  dataOffset?: number;
  dataSize?: number;
};

export function serializeWav(chunks: WavChunkRecord[]): Buffer {
  const fmt    = chunks.find((c) => c.chunkId === 'fmt ');
  const data   = chunks.find((c) => c.isAudioData);
  const fact   = chunks.find((c) => c.chunkId === 'fact' && !c.isAudioData);
  const bext   = chunks.find((c) => c.chunkId === 'bext');
  const others = chunks
    .filter((c) => !c.isAudioData && c.chunkId !== 'fmt ' && c.chunkId !== 'fact' && c.chunkId !== 'bext')
    .sort((a, b) => a.offset - b.offset);

  const ordered: WavChunkRecord[] = [
    ...(fmt  ? [fmt]  : []),
    ...others,
    ...(fact ? [fact] : []),
    ...(bext ? [bext] : []),
    ...(data ? [data] : []),
  ];

  const chunkBuffers: Buffer[] = [];
  for (const chunk of ordered) {
    let payload: Buffer;

    if (chunk.isAudioData) {
      if (chunk.rawData) {
        payload = chunk.rawData;
      } else {
        const fileBuf = readFileSync(chunk.filePath!);
        payload = fileBuf.slice(chunk.dataOffset!, chunk.dataOffset! + chunk.dataSize!);
      }
    } else {
      payload = chunk.rawData ?? Buffer.alloc(0);
    }

    const idBuf = Buffer.from(chunk.chunkId.padEnd(4, ' ').slice(0, 4), 'ascii');
    const sizeBuf = Buffer.alloc(4);
    sizeBuf.writeUInt32LE(payload.length, 0);

    chunkBuffers.push(idBuf, sizeBuf, payload);
    if (payload.length % 2 !== 0) {
      chunkBuffers.push(Buffer.alloc(1, 0));
    }
  }

  const chunksTotal = chunkBuffers.reduce((sum, b) => sum + b.length, 0);

  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(chunksTotal + 4, 4); // 4 bytes for 'WAVE'
  header.write('WAVE', 8, 'ascii');

  const result = Buffer.concat([header, ...chunkBuffers]);

  validateWav(result, fmt !== undefined, data !== undefined);

  return result;
}

function validateWav(buf: Buffer, hasFmt: boolean, hasData: boolean): void {
  if (buf.length < 12) {
    throw new Error('Sestavený WAV soubor je příliš malý.');
  }
  if (buf.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('Chybí RIFF hlavička v sestaveném souboru.');
  }
  if (buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Chybí WAVE identifikátor v sestaveném souboru.');
  }
  if (!hasFmt) {
    throw new Error('Chybí fmt chunk – soubor není platný WAV.');
  }
  if (!hasData) {
    throw new Error('Chybí data chunk – soubor neobsahuje audio data.');
  }
  const riffSize = buf.readUInt32LE(4);
  if (riffSize !== buf.length - 8) {
    throw new Error(
      `RIFF size field (${riffSize}) neodpovídá délce bufferu minus 8 (${buf.length - 8}).`,
    );
  }
}