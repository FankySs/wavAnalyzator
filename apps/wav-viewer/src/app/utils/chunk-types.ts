export const CHUNK_TYPES = [
  'fmt', 'data', 'LIST', 'INFO', 'bext', 'cue', 'smpl', 'inst',
  'fact', 'peak', 'cart', 'disp', 'axml', 'ixml', 'umid', 'adtl',
  'mext', 'levl', 'junk',
] as const;

export type ChunkType = (typeof CHUNK_TYPES)[number];