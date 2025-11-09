import { ParsedWav, RiffChunk, InfoEntry } from '../types/parsed-wav-type';
import { parseListInfo } from './parse-list-info';
import { parseFmtChunk } from './parse-fmt';

const tag = (dv: DataView, o: number) =>
  String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));

export function parseWavArrayBuffer(buffer: ArrayBuffer): ParsedWav {
  const dv = new DataView(buffer);

  if (tag(dv, 0) !== 'RIFF') throw new Error('Soubor není RIFF.');
  if (tag(dv, 8) !== 'WAVE') throw new Error('Soubor není WAVE.');

  let fmtFound = false;
  let dataFound = false;

  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let byteRate = 0;
  let blockAlign = 0;
  let bitsPerSample = 0;
  let dataSize = 0;
  let fmtExtensible: ParsedWav['fmtExtensible'] | undefined;

  const chunks: RiffChunk[] = [];
  let info: InfoEntry[] | undefined;

  let off = 12;
  while (off + 8 <= dv.byteLength) {
    const id = tag(dv, off);
    const size = dv.getUint32(off + 4, true);
    const payload = off + 8;

    // ulož chunk do seznamu
    chunks.push({ id, offset: off, payloadOffset: payload, size });

    if (id === 'fmt ') {
      const f = parseFmtChunk(dv, payload, size);
      audioFormat   = f.audioFormat;
      channels      = f.channels;
      sampleRate    = f.sampleRate;
      byteRate      = f.byteRate;
      blockAlign    = f.blockAlign;
      bitsPerSample = f.bitsPerSample;
      fmtExtensible = f.fmtExtensible;
      fmtFound = true;
    } else if (id === 'data') {
      dataSize = size;
      dataFound = true;
    } else if (id === 'LIST') {
      const maybeInfo = parseListInfo(dv, payload, size);
      if (maybeInfo.length > 0) {
        info = maybeInfo;
      }
    }

    // zarovnání na 2 byty
    const padded = size + (size % 2);
    off = payload + padded;
  }

  if (!fmtFound)  throw new Error('Chybí blok "fmt ".');
  if (!dataFound) throw new Error('Chybí blok "data".');

  const durationSec = byteRate > 0 ? dataSize / byteRate : 0;

  return {
    audioFormat,
    channels,
    sampleRate,
    byteRate,
    blockAlign,
    bitsPerSample,
    dataSize,
    durationSec,
    chunks,
    info,
    fmtExtensible,
  };
}
