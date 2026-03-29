export type ListInfoEntry = { id: string; value: string };

/**
 * Serializuje pole INFO tagů do binárního payloadu LIST/INFO chunku.
 * Vrácený Buffer začíná 'INFO' (= payload od payloadOffset v RIFF souboru).
 * Formát každého sub-chunku: id[4] + size[4 LE] + text (null-terminated, padded na sudý počet bajtů).
 */
export function serializeListInfo(entries: ListInfoEntry[]): Buffer {
  let payloadSize = 4; // 'INFO' tag

  for (const entry of entries) {
    const valueLen = entry.value.length + 1; // +1 pro null terminátor
    const paddedLen = valueLen + (valueLen % 2);
    payloadSize += 8 + paddedLen; // id(4) + size(4) + payload
  }

  const buf = Buffer.alloc(payloadSize, 0);
  let off = 0;

  buf.write('INFO', off, 'ascii');
  off += 4;

  for (const entry of entries) {
    const valueLen = entry.value.length + 1;

    buf.write(entry.id.slice(0, 4).padEnd(4, ' '), off, 'ascii');
    off += 4;

    buf.writeUInt32LE(valueLen, off);
    off += 4;

    buf.write(entry.value, off, 'ascii');
    off += entry.value.length;

    buf[off] = 0; // null terminátor
    off++;

    if (valueLen % 2 === 1) off++; // padding byte (již nulový z Buffer.alloc)
  }

  return buf;
}
