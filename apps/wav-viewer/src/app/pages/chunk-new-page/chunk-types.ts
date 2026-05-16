export type ChunkTypeId =
  | 'list-info'
  | 'bext'
  | 'cue'
  | 'fact'
  | 'inst'
  | 'smpl'
  | 'cart'
  | 'disp'
  | 'ixml'
  | 'axml';

export type ChunkType = {
  id: ChunkTypeId;
  fourCC: string;
  label: string;
  description: string;
};

export const SINGLE_INSTANCE_4CC: Record<ChunkTypeId, string | null> = {
  'list-info': 'LIST',
  'bext':      'bext',
  'cue':       'cue ',
  'fact':      'fact',
  'inst':      'inst',
  'smpl':      'smpl',
  'cart':      'cart',
  'disp':      'DISP',
  'ixml':      'ixml',
  'axml':      'axml',
};

export const CHUNK_TYPES: ChunkType[] = [
  { id: 'list-info', fourCC: 'LIST', label: 'LIST/INFO',           description: 'Text metadata – name, artist, album, date, comments' },
  { id: 'bext',      fourCC: 'bext', label: 'Broadcast Extension', description: 'Broadcast Extension – professional metadata for broadcast and archiving' },
  { id: 'cue',       fourCC: 'cue ', label: 'Cue Points',          description: 'Cue points – markers within the recording for navigation and editing' },
  { id: 'fact',      fourCC: 'fact', label: 'Sample Count',        description: 'Sample count – required for compressed formats (ADPCM, etc.)' },
  { id: 'inst',      fourCC: 'inst', label: 'Instrument',          description: 'Instrument – MIDI range and dynamics for software instruments' },
  { id: 'smpl',      fourCC: 'smpl', label: 'Sampler data',        description: 'Sampler data – loop parameters and MIDI tuning for samplers' },
  { id: 'cart',      fourCC: 'cart', label: 'Broadcast Cart',      description: 'Broadcast cart – metadata for radio broadcast (NAB standard)' },
  { id: 'disp',      fourCC: 'DISP', label: 'File Description',    description: 'File description – short text description displayable in applications' },
  { id: 'ixml',      fourCC: 'ixml', label: 'iXML Metadata',       description: 'iXML metadata – film production, scene and take information' },
  { id: 'axml',      fourCC: 'axml', label: 'EBU Core XML',        description: 'EBU Core XML – professional archival metadata in XML format' },
];