import type {
  CreateBextDto,
  UpdateBextDto,
  CreateCueDto,
  CreateInstDto,
  CreateSmplDto,
  UpdateSmplDto,
  UpdatePeakDto,
  CreateCartDto,
  UpdateCartDto,
  UpdateAdtlEntryDto,
  UpdateMextDto,
  UpdateLevlDto,
} from '@shared-types';

function writeFixedAscii(buf: Buffer, text: string, offset: number, maxLen: number): void {
  buf.write(text.slice(0, maxLen), offset, 'ascii');
  // remaining bytes already zero (Buffer.alloc)
}

export function serializeFact(sampleLength: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(sampleLength, 0);
  return buf;
}

export function serializeInst(dto: CreateInstDto): Buffer {
  const buf = Buffer.alloc(7);
  buf[0] = dto.unshiftedNote & 0xff;
  buf.writeInt8(dto.fineTune, 1);
  buf.writeInt8(dto.gain, 2);
  buf[3] = dto.lowNote & 0xff;
  buf[4] = dto.highNote & 0xff;
  buf[5] = dto.lowVelocity & 0xff;
  buf[6] = dto.highVelocity & 0xff;
  return buf;
}

export function serializeBext(dto: CreateBextDto): Buffer {
  // Minimum 412 B (BWF v0): description(256)+originator(32)+originatorRef(32)+date(10)+time(8)+timeRefLow(4)+timeRefHigh(4)+version(2)+UMID(64)
  const buf = Buffer.alloc(412, 0);
  writeFixedAscii(buf, dto.description, 0, 256);
  writeFixedAscii(buf, dto.originator, 256, 32);
  writeFixedAscii(buf, dto.originatorReference, 288, 32);
  writeFixedAscii(buf, dto.originationDate, 320, 10);
  writeFixedAscii(buf, dto.originationTime, 330, 8);
  buf.writeUInt32LE(dto.timeReferenceLow ?? 0, 338);
  buf.writeUInt32LE(dto.timeReferenceHigh ?? 0, 342);
  buf.writeUInt16LE(0, 346); // version 0
  // UMID (348–411): all zeros
  return buf;
}

export function serializeBextUpdate(dto: UpdateBextDto, existingRaw?: Buffer): Buffer {
  // BWF bext fixed header: 602 B (412 base + 10 loudness reserved + 180 reserved)
  const codingBuf = dto.codingHistory
    ? Buffer.from(dto.codingHistory, 'ascii')
    : Buffer.alloc(0);
  const buf = Buffer.alloc(602 + codingBuf.length, 0);

  // Preserve version, UMID and loudness fields from existing chunk
  if (existingRaw && existingRaw.length >= 412) {
    existingRaw.copy(buf, 346, 346, 348); // version
    existingRaw.copy(buf, 348, 348, 412); // UMID
    if (existingRaw.length >= 422) {
      existingRaw.copy(buf, 412, 412, 422); // loudness fields
    }
  }

  writeFixedAscii(buf, dto.description, 0, 256);
  writeFixedAscii(buf, dto.originator, 256, 32);
  writeFixedAscii(buf, dto.originatorReference, 288, 32);
  writeFixedAscii(buf, dto.originationDate, 320, 10);
  writeFixedAscii(buf, dto.originationTime, 330, 8);
  buf.writeUInt32LE(dto.timeReference >>> 0, 338);
  buf.writeUInt32LE(Math.floor(dto.timeReference / 4294967296) >>> 0, 342);

  if (codingBuf.length > 0) {
    codingBuf.copy(buf, 602);
  }

  return buf;
}

export function serializeCue(dto: CreateCueDto): Buffer {
  const n = dto.points.length;
  const buf = Buffer.alloc(4 + n * 24, 0);
  buf.writeUInt32LE(n, 0);
  for (let i = 0; i < n; i++) {
    const off = 4 + i * 24;
    buf.writeUInt32LE(i + 1, off);                          // id
    buf.writeUInt32LE(dto.points[i].sampleOffset, off + 4); // position
    buf.write('data', off + 8, 'ascii');                    // dataChunkId
    buf.writeUInt32LE(0, off + 12);                         // chunkStart
    buf.writeUInt32LE(0, off + 16);                         // blockStart
    buf.writeUInt32LE(dto.points[i].sampleOffset, off + 20);// sampleOffset
  }
  return buf;
}

export function serializeSmpl(dto: CreateSmplDto): Buffer {
  const loops = dto.loops ?? [];
  const buf = Buffer.alloc(36 + loops.length * 24, 0);
  buf.writeUInt32LE(0, 0);             // manufacturer
  buf.writeUInt32LE(0, 4);             // product
  buf.writeUInt32LE(dto.samplePeriod, 8);
  buf.writeUInt32LE(dto.midiUnityNote, 12);
  buf.writeUInt32LE(0, 16);            // midiPitchFraction
  buf.writeUInt32LE(0, 20);            // smpteFormat
  buf.writeUInt32LE(0, 24);            // smpteOffset
  buf.writeUInt32LE(loops.length, 28); // numLoops
  buf.writeUInt32LE(0, 32);            // samplerData
  for (let i = 0; i < loops.length; i++) {
    const off = 36 + i * 24;
    buf.writeUInt32LE(i + 1, off);
    buf.writeUInt32LE(loops[i].type ?? 0, off + 4);
    buf.writeUInt32LE(loops[i].start, off + 8);
    buf.writeUInt32LE(loops[i].end, off + 12);
    buf.writeUInt32LE(0, off + 16);
    buf.writeUInt32LE(loops[i].playCount ?? 0, off + 20);
  }
  return buf;
}

export function serializeSmplUpdate(dto: UpdateSmplDto): Buffer {
  const loops = dto.loops ?? [];
  const buf = Buffer.alloc(36 + loops.length * 24, 0);
  buf.writeUInt32LE(0, 0);                            // manufacturer
  buf.writeUInt32LE(0, 4);                            // product
  buf.writeUInt32LE(dto.samplePeriod, 8);
  buf.writeUInt32LE(dto.midiUnityNote, 12);
  buf.writeUInt32LE(dto.midiPitchFraction, 16);
  buf.writeUInt32LE(dto.smpteFormat, 20);
  buf.writeUInt32LE(dto.smpteOffset, 24);
  buf.writeUInt32LE(loops.length, 28);
  buf.writeUInt32LE(0, 32);                           // samplerData
  for (let i = 0; i < loops.length; i++) {
    const off = 36 + i * 24;
    buf.writeUInt32LE(i + 1, off);                    // cuePointId
    buf.writeUInt32LE(loops[i].type, off + 4);
    buf.writeUInt32LE(loops[i].start, off + 8);
    buf.writeUInt32LE(loops[i].end, off + 12);
    buf.writeUInt32LE(loops[i].fraction, off + 16);
    buf.writeUInt32LE(loops[i].playCount, off + 20);
  }
  return buf;
}

export function serializeAdtl(entries: UpdateAdtlEntryDto[]): Buffer {
  const subchunks: Buffer[] = [];

  for (const entry of entries) {
    let payload: Buffer;

    if (entry.type === 'labl' || entry.type === 'note') {
      const textBuf = Buffer.from(entry.text, 'ascii');
      payload = Buffer.alloc(4 + textBuf.length + 1, 0);
      payload.writeUInt32LE(entry.cuePointId, 0);
      textBuf.copy(payload, 4);
    } else {
      // ltxt
      const textBuf = Buffer.from(entry.text, 'ascii');
      payload = Buffer.alloc(20 + textBuf.length + 1, 0);
      payload.writeUInt32LE(entry.cuePointId, 0);
      // sampleLength = 0 at offset 4 (zero-filled)
      payload.write('lgwv', 8, 'ascii'); // purposeId
      // country/language/dialect/codepage = 0
      textBuf.copy(payload, 20);
    }

    const idBuf = Buffer.from(entry.type, 'ascii');
    const sizeBuf = Buffer.alloc(4);
    sizeBuf.writeUInt32LE(payload.length, 0);
    subchunks.push(idBuf, sizeBuf, payload);
    if (payload.length % 2 !== 0) {
      subchunks.push(Buffer.alloc(1, 0)); // pad to even
    }
  }

  const payloadSize = subchunks.reduce((sum, b) => sum + b.length, 0);
  const result = Buffer.alloc(4 + payloadSize, 0);
  result.write('adtl', 0, 'ascii');
  let offset = 4;
  for (const b of subchunks) {
    b.copy(result, offset);
    offset += b.length;
  }
  return result;
}

export function serializeMext(dto: UpdateMextDto): Buffer {
  const buf = Buffer.alloc(8, 0);
  buf.writeUInt16LE(dto.soundInformation, 0);
  buf.writeUInt16LE(dto.frameCount, 2);
  buf.writeUInt16LE(dto.ancillaryDataLength, 4);
  buf.writeUInt16LE(dto.ancillaryDataDef, 6);
  return buf;
}

export function serializeLevlHeader(dto: UpdateLevlDto, existingRaw: Buffer): Buffer {
  const buf = Buffer.alloc(24, 0);
  existingRaw.copy(buf, 0, 0, Math.min(24, existingRaw.length));
  buf.writeUInt32LE(dto.version, 0);
  buf.writeUInt32LE(dto.format, 4);
  // pointsPerValue at 8: preserved from existing
  buf.writeUInt32LE(dto.blockSize, 12);
  buf.writeUInt32LE(dto.channelCount, 16);
  // frameCount at 20: preserved from existing
  return buf;
}

export function serializeCartUpdate(dto: UpdateCartDto): Buffer {
  const buf = Buffer.alloc(2048, 0);
  writeFixedAscii(buf, '0101', 0, 4);
  writeFixedAscii(buf, dto.title, 4, 64);
  writeFixedAscii(buf, dto.artist, 68, 64);
  writeFixedAscii(buf, dto.cutId, 132, 64);
  writeFixedAscii(buf, dto.clientId, 196, 64);
  writeFixedAscii(buf, dto.category, 260, 64);
  writeFixedAscii(buf, dto.classification, 324, 64);
  writeFixedAscii(buf, dto.outCue, 388, 64);
  writeFixedAscii(buf, dto.startDate, 452, 10);
  writeFixedAscii(buf, dto.startTime, 462, 8);
  writeFixedAscii(buf, dto.endDate, 470, 10);
  writeFixedAscii(buf, dto.endTime, 480, 8);
  writeFixedAscii(buf, dto.producerAppId, 488, 64);
  writeFixedAscii(buf, dto.producerAppVersion, 552, 64);
  writeFixedAscii(buf, dto.userDef, 616, 64);
  buf.writeInt32LE(0, 680); // levelReference
  writeFixedAscii(buf, dto.url, 724, 1024);
  writeFixedAscii(buf, dto.tag, 1748, 300);
  return buf;
}

export function serializeDisp(text: string): Buffer {
  const textBuf = Buffer.from(text, 'ascii');
  const buf = Buffer.alloc(4 + textBuf.length);
  buf.writeUInt32LE(1, 0); // CF_TEXT
  textBuf.copy(buf, 4);
  return buf;
}

export function serializeXml(xml: string): Buffer {
  return Buffer.from(xml, 'utf8');
}

export function serializePeak(dto: UpdatePeakDto, version = 1, timeStamp = 0): Buffer {
  const buf = Buffer.alloc(8 + dto.channels.length * 8, 0);
  buf.writeUInt32LE(version, 0);
  buf.writeUInt32LE(timeStamp, 4);
  for (let i = 0; i < dto.channels.length; i++) {
    buf.writeFloatLE(dto.channels[i].value, 8 + i * 8);
    buf.writeUInt32LE(dto.channels[i].position, 8 + i * 8 + 4);
  }
  return buf;
}

export function serializeUmid(umidHex: string): Buffer {
  return Buffer.from(umidHex, 'hex');
}

export function serializeCart(dto: CreateCartDto): Buffer {
  const buf = Buffer.alloc(2048, 0);
  writeFixedAscii(buf, '0101', 0, 4);          // version
  writeFixedAscii(buf, dto.title, 4, 64);
  writeFixedAscii(buf, dto.artist, 68, 64);
  writeFixedAscii(buf, '', 132, 64);            // cutId
  writeFixedAscii(buf, '', 196, 64);            // clientId
  writeFixedAscii(buf, dto.category, 260, 64);
  writeFixedAscii(buf, '', 324, 64);            // classification
  writeFixedAscii(buf, '', 388, 64);            // outCue
  writeFixedAscii(buf, dto.startDate, 452, 10);
  writeFixedAscii(buf, dto.startTime, 462, 8);
  writeFixedAscii(buf, dto.endDate, 470, 10);
  writeFixedAscii(buf, dto.endTime, 480, 8);
  buf.writeInt32LE(0, 680);                     // levelReference
  writeFixedAscii(buf, dto.url ?? '', 724, 1024);
  return buf;
}
