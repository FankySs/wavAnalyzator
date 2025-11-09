export function parseFmtChunk(dv: DataView, payload: number, size: number) {
  if (size < 16) throw new Error('Blok "fmt " je kratší než 16 B.');
  const audioFormat   = dv.getUint16(payload + 0,  true);
  const channels      = dv.getUint16(payload + 2,  true);
  const sampleRate    = dv.getUint32(payload + 4,  true);
  const byteRate      = dv.getUint32(payload + 8,  true);
  const blockAlign    = dv.getUint16(payload + 12, true);
  const bitsPerSample = dv.getUint16(payload + 14, true);

  const out: {
    audioFormat: number;
    channels: number;
    sampleRate: number;
    byteRate: number;
    blockAlign: number;
    bitsPerSample: number;
    fmtExtensible?: {
      cbSize: number;
      validBitsPerSample?: number;
      channelMask?: number;
      subFormatGuid?: string;
    };
  } = { audioFormat, channels, sampleRate, byteRate, blockAlign, bitsPerSample };

  // Má „extra“ část? (size >= 18 → cbSize existuje)
  if (size >= 18) {
    const cbSize = dv.getUint16(payload + 16, true);

    // WAVE_FORMAT_EXTENSIBLE == 0xFFFE a extra část má být min. 22 B
    if (audioFormat === 0xFFFE && size >= 18 + 22 && cbSize >= 22) {
      const validBitsPerSample = dv.getUint16(payload + 18, true);
      const channelMask        = dv.getUint32(payload + 20, true);
      const subFormatGuid      = readGuidAsString(dv, payload + 24);

      out.fmtExtensible = {
        cbSize,
        validBitsPerSample,
        channelMask,
        subFormatGuid,
      };
    } else {
      // u ne-extensible formátů si můžeme cbSize jen poznamenat (hodí se pro debug)
      out.fmtExtensible = { cbSize };
    }
  }

  return out;
}

function readGuidAsString(dv: DataView, off: number): string {
  // GUID je uložen LE ve formátu: Data1 (u32 LE), Data2 (u16 LE), Data3 (u16 LE), Data4 (8B big-endian pořadí)
  const d1 = dv.getUint32(off + 0, true).toString(16).padStart(8, '0');
  const d2 = dv.getUint16(off + 4, true).toString(16).padStart(4, '0');
  const d3 = dv.getUint16(off + 6, true).toString(16).padStart(4, '0');
  const d4 = Array.from({ length: 2 }, (_, i) => dv.getUint8(off + 8 + i).toString(16).padStart(2, '0')).join('');
  const d5 = Array.from({ length: 6 }, (_, i) => dv.getUint8(off + 10 + i).toString(16).padStart(2, '0')).join('');
  return `${d1}-${d2}-${d3}-${d4}-${d5}`.toUpperCase();
}
