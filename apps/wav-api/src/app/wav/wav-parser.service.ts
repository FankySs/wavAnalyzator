import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  ParsedChunkData,
  FmtParsed,
  ListInfoParsed,
  BextParsed,
  SmplParsed,
  CueParsed,
  FactParsed,
  PeakParsed,
  InstParsed,
  AdtlParsed,
  AdtlEntry,
  CartParsed,
  AxmlParsed,
  IxmlParsed,
  JunkParsed,
  MextParsed,
  LevlParsed,
  UmidParsed,
  DispParsed,
  Id3Parsed,
  UnknownParsed,
} from '@shared-types';

export type ChunkParseResult = {
  chunkId: string;
  offset: number;
  payloadOffset: number;
  size: number;
  isAudioData: boolean;
  rawData: Buffer | null;
};

const AUDIO_FORMAT_NAMES: Record<number, string> = {
  0x0001: 'PCM',
  0x0003: 'IEEE_FLOAT',
  0x0006: 'ALAW',
  0x0007: 'MULAW',
  0x0011: 'IMA_ADPCM',
  0xfffe: 'EXTENSIBLE',
};

/** 4CC IDs of padding/alignment chunks — never store rawData */
const PADDING_IDS = new Set(['JUNK', 'FLLR', 'PAD ']);

function readTag(buf: Buffer, off: number): string {
  return buf.toString('ascii', off, off + 4);
}

function readGuid(buf: Buffer, off: number): string {
  const d1 = buf.readUInt32LE(off).toString(16).padStart(8, '0');
  const d2 = buf.readUInt16LE(off + 4).toString(16).padStart(4, '0');
  const d3 = buf.readUInt16LE(off + 6).toString(16).padStart(4, '0');
  const d4 = Array.from({ length: 2 }, (_, i) => buf[off + 8 + i].toString(16).padStart(2, '0')).join('');
  const d5 = Array.from({ length: 6 }, (_, i) => buf[off + 10 + i].toString(16).padStart(2, '0')).join('');
  return `${d1}-${d2}-${d3}-${d4}-${d5}`.toUpperCase();
}

function readFixedAscii(buf: Buffer, start: number, length: number): string {
  let end = start;
  while (end < start + length && buf[end] !== 0) end++;
  return buf.toString('ascii', start, end).trimEnd();
}

function readUtf8(buf: Buffer, start: number, length: number): string {
  const slice = buf.subarray(start, start + length);
  let end = slice.indexOf(0);
  if (end === -1) end = slice.length;
  return slice.toString('utf8', 0, end).trimEnd();
}

@Injectable()
export class WavParserService {
  /** Projde celý WAV buffer a vrátí seznam chunků s raw daty. */
  parse(buffer: Buffer): ChunkParseResult[] {
    const chunks: ChunkParseResult[] = [];
    let fmtFound = false;
    let dataFound = false;

    let off = 12; // přeskoč RIFF header (validace proběhla v WavValidatorService)
    while (off + 8 <= buffer.length) {
      const id = readTag(buffer, off);
      const size = buffer.readUInt32LE(off + 4);
      const payloadOffset = off + 8;

      if (payloadOffset + size > buffer.length) break; // ochrana proti poškozeným souborům

      const isAudioData = id === 'data';
      // padding chunks a data chunk — rawData se neukládají
      const isPadding = PADDING_IDS.has(id);
      const rawData = isAudioData || isPadding
        ? null
        : buffer.subarray(payloadOffset, payloadOffset + Math.min(size, 65536));

      // levl: uchovej pouze 24bajtovou hlavičku
      const effectiveRaw = id === 'levl' && rawData
        ? buffer.subarray(payloadOffset, payloadOffset + Math.min(24, size))
        : rawData;

      chunks.push({ chunkId: id, offset: off, payloadOffset, size, isAudioData, rawData: effectiveRaw });

      if (id === 'fmt ') fmtFound = true;
      if (id === 'data') dataFound = true;

      const padded = size + (size % 2);
      off = payloadOffset + padded;
    }

    if (!fmtFound) throw new BadRequestException('Soubor neobsahuje povinný blok "fmt ".');
    if (!dataFound) throw new BadRequestException('Soubor neobsahuje povinný blok "data".');

    return chunks;
  }

  /** Parsuje uložený payload konkrétního chunku do strukturovaných dat. */
  parseChunkData(chunkId: string, rawData: Buffer): ParsedChunkData {
    try {
      switch (chunkId) {
        case 'fmt ':  return this.parseFmt(rawData);
        case 'LIST':  return this.parseList(rawData);
        case 'bext':  return this.parseBext(rawData);
        case 'smpl':  return this.parseSmpl(rawData);
        case 'cue ':  return this.parseCue(rawData);
        case 'fact':  return this.parseFact(rawData);
        case 'PEAK':  return this.parsePeak(rawData);
        case 'inst':  return this.parseInst(rawData);
        case 'cart':  return this.parseCart(rawData);
        case 'axml':  return this.parseXml(rawData, 'axml');
        case 'ixml':  return this.parseXml(rawData, 'ixml');
        case 'mext':  return this.parseMext(rawData);
        case 'levl':  return this.parseLevl(rawData);
        case 'umid':  return this.parseUmid(rawData);
        case 'DISP':  return this.parseDisp(rawData);
        case 'id3 ':
        case 'ID3 ':  return this.parseId3(rawData);
        default:      return this.parseUnknown(rawData);
      }
    } catch {
      return this.parseUnknown(rawData);
    }
  }

  /** Vrátí JunkParsed pro JUNK/PAD/FLLR chunky, kde rawData není uloženo. */
  parsePaddingChunk(chunkId: string, size: number): JunkParsed {
    void chunkId;
    return { chunkType: 'junk', byteCount: size };
  }

  // -------------------------------------------------------------------------

  private parseFmt(buf: Buffer): FmtParsed {
    if (buf.length < 16) throw new Error('fmt chunk příliš malý (min. 16 B).');

    const audioFormat = buf.readUInt16LE(0);
    const channels = buf.readUInt16LE(2);
    const sampleRate = buf.readUInt32LE(4);
    const byteRate = buf.readUInt32LE(8);
    const blockAlign = buf.readUInt16LE(12);
    const bitsPerSample = buf.readUInt16LE(14);

    const result: FmtParsed = {
      chunkType: 'fmt',
      audioFormat,
      audioFormatName: AUDIO_FORMAT_NAMES[audioFormat] ?? `UNKNOWN(0x${audioFormat.toString(16).toUpperCase()})`,
      channels,
      sampleRate,
      byteRate,
      blockAlign,
      bitsPerSample,
    };

    if (buf.length >= 18) {
      const cbSize = buf.readUInt16LE(16);
      if (audioFormat === 0xfffe && buf.length >= 40 && cbSize >= 22) {
        result.extensible = {
          cbSize,
          validBitsPerSample: buf.readUInt16LE(18),
          channelMask: buf.readUInt32LE(20),
          subFormatGuid: readGuid(buf, 24),
        };
      } else {
        result.extensible = { cbSize };
      }
    }

    return result;
  }

  private parseList(buf: Buffer): ListInfoParsed | AdtlParsed | UnknownParsed {
    if (buf.length < 4) return this.parseUnknown(buf);

    const listType = buf.toString('ascii', 0, 4);

    if (listType === 'INFO') {
      const entries: ListInfoParsed['entries'] = [];
      let off = 4;

      while (off + 8 <= buf.length) {
        const id = buf.toString('ascii', off, off + 4);
        const size = buf.readUInt32LE(off + 4);
        const payloadOff = off + 8;

        if (payloadOff + size > buf.length) break;

        let text = '';
        for (let i = 0; i < size; i++) {
          const c = buf[payloadOff + i];
          if (c === 0) break;
          text += String.fromCharCode(c);
        }
        entries.push({ id, value: text.replace(/[\r\n\t]+$/g, '') });

        const padded = size + (size % 2);
        off = payloadOff + padded;
      }

      return { chunkType: 'LIST_INFO', entries };
    }

    if (listType === 'adtl') {
      const entries: AdtlEntry[] = [];
      let off = 4;

      while (off + 8 <= buf.length) {
        const id = buf.toString('ascii', off, off + 4);
        const size = buf.readUInt32LE(off + 4);
        const payloadOff = off + 8;

        if (payloadOff + size > buf.length) break;

        if ((id === 'labl' || id === 'note') && size >= 4) {
          const cuePointId = buf.readUInt32LE(payloadOff);
          let text = '';
          for (let i = 4; i < size; i++) {
            const c = buf[payloadOff + i];
            if (c === 0) break;
            text += String.fromCharCode(c);
          }
          entries.push({ id, cuePointId, text });
        } else if (id === 'ltxt' && size >= 20) {
          const cuePointId = buf.readUInt32LE(payloadOff);
          const sampleLength = buf.readUInt32LE(payloadOff + 4);
          const purposeId = buf.toString('ascii', payloadOff + 8, payloadOff + 12);
          let text = '';
          for (let i = 20; i < size; i++) {
            const c = buf[payloadOff + i];
            if (c === 0) break;
            text += String.fromCharCode(c);
          }
          entries.push({ id, cuePointId, sampleLength, purposeId, text });
        }

        const padded = size + (size % 2);
        off = payloadOff + padded;
      }

      return { chunkType: 'adtl', entries };
    }

    return this.parseUnknown(buf);
  }

  private parseBext(buf: Buffer): BextParsed {
    // Minimum v0: 256+32+32+10+8+4+4+2+64 = 412 B
    if (buf.length < 412) throw new Error('bext chunk příliš malý (min. 412 B).');

    const result: BextParsed = {
      chunkType: 'bext',
      description: readFixedAscii(buf, 0, 256),
      originator: readFixedAscii(buf, 256, 32),
      originatorReference: readFixedAscii(buf, 288, 32),
      originationDate: readFixedAscii(buf, 320, 10),
      originationTime: readFixedAscii(buf, 330, 8),
      timeReferenceLow: buf.readUInt32LE(338),
      timeReferenceHigh: buf.readUInt32LE(342),
      version: buf.readUInt16LE(346),
      umid: buf.toString('hex', 348, 412),
    };

    // Loudness fields (BWF v2+, offset 412, potřebuje dalších 10 B)
    if (result.version >= 2 && buf.length >= 422) {
      result.loudnessValue = buf.readInt16LE(412);
      result.loudnessRange = buf.readInt16LE(414);
      result.maxTruePeakLevel = buf.readInt16LE(416);
      result.maxMomentaryLoudness = buf.readInt16LE(418);
      result.maxShortTermLoudness = buf.readInt16LE(420);
    }

    // CodingHistory — variable-length field starts at offset 602
    if (buf.length > 602) {
      result.codingHistory = readFixedAscii(buf, 602, buf.length - 602);
    }

    return result;
  }

  private parseSmpl(buf: Buffer): SmplParsed {
    if (buf.length < 36) throw new Error('smpl chunk příliš malý (min. 36 B).');

    const numLoops = buf.readUInt32LE(28);
    const loops: SmplParsed['loops'] = [];

    for (let i = 0; i < numLoops; i++) {
      const loopOff = 36 + i * 24;
      if (loopOff + 24 > buf.length) break;
      loops.push({
        cuePointId: buf.readUInt32LE(loopOff),
        type: buf.readUInt32LE(loopOff + 4),
        start: buf.readUInt32LE(loopOff + 8),
        end: buf.readUInt32LE(loopOff + 12),
        fraction: buf.readUInt32LE(loopOff + 16),
        playCount: buf.readUInt32LE(loopOff + 20),
      });
    }

    return {
      chunkType: 'smpl',
      manufacturer: buf.readUInt32LE(0),
      product: buf.readUInt32LE(4),
      samplePeriod: buf.readUInt32LE(8),
      midiUnityNote: buf.readUInt32LE(12),
      midiPitchFraction: buf.readUInt32LE(16),
      smpteFormat: buf.readUInt32LE(20),
      smpteOffset: buf.readUInt32LE(24),
      loops,
    };
  }

  private parseCue(buf: Buffer): CueParsed {
    if (buf.length < 4) throw new Error('cue chunk příliš malý (min. 4 B).');

    const numPoints = buf.readUInt32LE(0);
    const points: CueParsed['points'] = [];

    for (let i = 0; i < numPoints; i++) {
      const pointOff = 4 + i * 24;
      if (pointOff + 24 > buf.length) break;
      points.push({
        id: buf.readUInt32LE(pointOff),
        position: buf.readUInt32LE(pointOff + 4),
        dataChunkId: buf.toString('ascii', pointOff + 8, pointOff + 12),
        chunkStart: buf.readUInt32LE(pointOff + 12),
        blockStart: buf.readUInt32LE(pointOff + 16),
        sampleOffset: buf.readUInt32LE(pointOff + 20),
      });
    }

    return { chunkType: 'cue', points };
  }

  private parseFact(buf: Buffer): FactParsed {
    if (buf.length < 4) throw new Error('fact chunk příliš malý (min. 4 B).');
    return { chunkType: 'fact', sampleLength: buf.readUInt32LE(0) };
  }

  private parsePeak(buf: Buffer): PeakParsed {
    if (buf.length < 8) throw new Error('PEAK chunk příliš malý (min. 8 B).');
    const version = buf.readUInt32LE(0);
    const timeStamp = buf.readUInt32LE(4);
    const channels: PeakParsed['channels'] = [];
    let off = 8;
    while (off + 8 <= buf.length) {
      channels.push({
        value: buf.readFloatLE(off),
        position: buf.readUInt32LE(off + 4),
      });
      off += 8;
    }
    return { chunkType: 'peak', version, timeStamp, channels };
  }

  private parseInst(buf: Buffer): InstParsed {
    if (buf.length < 7) throw new Error('inst chunk příliš malý (min. 7 B).');
    return {
      chunkType: 'inst',
      unshiftedNote: buf[0],
      fineTune: buf.readInt8(1),
      gain: buf.readInt8(2),
      lowNote: buf[3],
      highNote: buf[4],
      lowVelocity: buf[5],
      highVelocity: buf[6],
    };
  }

  private parseCart(buf: Buffer): CartParsed {
    if (buf.length < 2048) throw new Error('cart chunk příliš malý (min. 2048 B).');
    return {
      chunkType: 'cart',
      version: readFixedAscii(buf, 0, 4),
      title: readFixedAscii(buf, 4, 64),
      artist: readFixedAscii(buf, 68, 64),
      cutId: readFixedAscii(buf, 132, 64),
      clientId: readFixedAscii(buf, 196, 64),
      category: readFixedAscii(buf, 260, 64),
      classification: readFixedAscii(buf, 324, 64),
      outCue: readFixedAscii(buf, 388, 64),
      startDate: readFixedAscii(buf, 452, 10),
      startTime: readFixedAscii(buf, 462, 8),
      endDate: readFixedAscii(buf, 470, 10),
      endTime: readFixedAscii(buf, 480, 8),
      producerAppId: readFixedAscii(buf, 488, 64),
      producerAppVersion: readFixedAscii(buf, 552, 64),
      userDef: readFixedAscii(buf, 616, 64),
      levelReference: buf.readInt32LE(680),
      url: readFixedAscii(buf, 724, 1024),
      tag: buf.length > 1748 ? readFixedAscii(buf, 1748, buf.length - 1748) : undefined,
    };
  }

  private parseXml(buf: Buffer, id: 'axml'): AxmlParsed;
  private parseXml(buf: Buffer, id: 'ixml'): IxmlParsed;
  private parseXml(buf: Buffer, id: 'axml' | 'ixml'): AxmlParsed | IxmlParsed {
    const xml = readUtf8(buf, 0, buf.length);
    return id === 'axml'
      ? { chunkType: 'axml', xml }
      : { chunkType: 'ixml', xml };
  }

  private parseMext(buf: Buffer): MextParsed {
    if (buf.length < 8) throw new Error('mext chunk příliš malý (min. 8 B).');
    return {
      chunkType: 'mext',
      soundInformation: buf.readUInt16LE(0),
      frameCount: buf.readUInt16LE(2),
      ancillaryDataLength: buf.readUInt16LE(4),
      ancillaryDataDef: buf.readUInt16LE(6),
    };
  }

  private parseLevl(buf: Buffer): LevlParsed {
    // 24-byte peak envelope header (full data truncated before storage)
    if (buf.length < 24) throw new Error('levl chunk hlavička příliš malá (min. 24 B).');
    return {
      chunkType: 'levl',
      version: buf.readUInt32LE(0),
      format: buf.readUInt32LE(4),
      pointsPerValue: buf.readUInt32LE(8),
      blockSize: buf.readUInt32LE(12),
      channels: buf.readUInt32LE(16),
      frameCount: buf.readUInt32LE(20),
      positionFrames: buf.length >= 28 ? buf.readUInt32LE(24) : 0,
      roomType: buf.length >= 32 ? readFixedAscii(buf, 28, 4) : '',
    };
  }

  private parseUmid(buf: Buffer): UmidParsed {
    return {
      chunkType: 'umid',
      umidHex: buf.toString('hex', 0, Math.min(64, buf.length)),
    };
  }

  private parseDisp(buf: Buffer): DispParsed {
    if (buf.length < 4) throw new Error('DISP chunk příliš malý (min. 4 B).');
    const cfType = buf.readUInt32LE(0);
    const text = readUtf8(buf, 4, buf.length - 4);
    return { chunkType: 'DISP', cfType, text };
  }

  private parseId3(buf: Buffer): Id3Parsed {
    return {
      chunkType: 'ID3',
      rawHex: buf.toString('hex', 0, Math.min(256, buf.length)),
    };
  }

  private parseUnknown(buf: Buffer): UnknownParsed {
    return {
      chunkType: 'unknown',
      rawHex: buf.toString('hex', 0, Math.min(256, buf.length)),
    };
  }
}
