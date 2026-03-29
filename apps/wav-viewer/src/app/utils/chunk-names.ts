export const CHUNK_NAMES: Record<string, string> = {
  'fmt ': 'Formát',
  'data': 'Audio data',
  'LIST': 'Metadata',
  'bext': 'Broadcast Extension',
  'cue ': 'Časové značky',
  'smpl': 'Sampler',
  'fact': 'Počet vzorků',
  'inst': 'Hudební parametry',
  'PEAK': 'Peak úrovně',
  'cart': 'Broadcast Cart',
  'DISP': 'Popis souboru',
  'ixml': 'iXML Metadata',
  'axml': 'EBU Core XML',
  'umid': 'Unique Material ID',
  'mext': 'MPEG Extension',
  'levl': 'Level Structure',
  'JUNK': 'Padding',
  'PAD ': 'Padding',
  'FLLR': 'Padding',
  'id3 ': 'ID3 Metadata',
  'ID3 ': 'ID3 Metadata',
};

export function getChunkName(chunkId: string): string {
  return CHUNK_NAMES[chunkId] ?? `Neznámý (${chunkId.trim()})`;
}