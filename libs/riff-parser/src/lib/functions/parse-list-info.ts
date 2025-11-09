import { InfoEntry } from '../types/parsed-wav-type';

const tagAt = (dv: DataView, off: number): string =>
  String.fromCharCode(
    dv.getUint8(off),
    dv.getUint8(off + 1),
    dv.getUint8(off + 2),
    dv.getUint8(off + 3),
  );

/**
 * Parsuje LIST chunk s typem INFO a vrací pole InfoEntry.
 * @param dv           DataView celé WAV
 * @param listPayload  offset na payload LIST chunku (tj. na typ, hned za 4CC 'LIST' a size)
 * @param listSize     velikost payloadu LIST chunku (bez paddingu)
 */
export function parseListInfo(dv: DataView, listPayload: number, listSize: number): InfoEntry[] {
  // Prvních 4 bajty payloadu LISTu je typ – musí být 'INFO'
  if (listSize < 4) return [];
  const listType = tagAt(dv, listPayload);
  if (listType !== 'INFO') return [];

  const out: InfoEntry[] = [];
  let off = listPayload + 4;             // za 'INFO'
  const end = listPayload + listSize;    // konec payloadu LISTu

  while (off + 8 <= end) {
    const id = tagAt(dv, off);
    const size = dv.getUint32(off + 4, true);
    const payload = off + 8;

    if (payload + size > dv.byteLength) break; // ochrana proti poškozeným souborům

    // INFO textové subchunky jsou ANSI/ASCII (často nulově ukončené)
    let text = '';
    for (let i = 0; i < size; i++) {
      const c = dv.getUint8(payload + i);
      if (c === 0) break; // zastav na první NUL
      text += String.fromCharCode(c);
    }
    // Trimni běžné konce řádků a whitespace
    text = text.replace(/[\r\n\t]+$/g, '');

    out.push({
      id,
      value: text,
      rawSize: size,
      offset: off,
      payloadOffset: payload,
    });

    // subchunky jsou zarovnané na 2 byty
    const padded = size + (size % 2);
    off = payload + padded;
  }

  return out;
}
