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
  { id: 'list-info', fourCC: 'LIST', label: 'LIST/INFO',           description: 'Textová metadata – název, interpret, album, datum, komentáře' },
  { id: 'bext',      fourCC: 'bext', label: 'Broadcast Extension', description: 'Broadcast Extension – profesionální metadata pro vysílání a archivaci' },
  { id: 'cue',       fourCC: 'cue ', label: 'Časové značky',       description: 'Časové značky – body v nahrávce pro navigaci a editaci' },
  { id: 'fact',      fourCC: 'fact', label: 'Počet vzorků',        description: 'Počet vzorků – povinné pro komprimované formáty (ADPCM apod.)' },
  { id: 'inst',      fourCC: 'inst', label: 'Hudební parametry',   description: 'Hudební parametry – MIDI rozsah a dynamika pro softwarové nástroje' },
  { id: 'smpl',      fourCC: 'smpl', label: 'Sampler data',        description: 'Sampler data – parametry smyček a MIDI ladění pro samplery' },
  { id: 'cart',      fourCC: 'cart', label: 'Broadcast Cart',      description: 'Broadcast cart – metadata pro rozhlasové vysílání (NAB standard)' },
  { id: 'disp',      fourCC: 'DISP', label: 'Popis souboru',       description: 'Popis souboru – krátký textový popis zobrazitelný v aplikacích' },
  { id: 'ixml',      fourCC: 'ixml', label: 'iXML Metadata',       description: 'iXML metadata – filmová produkce, informace o scéně a záznamu' },
  { id: 'axml',      fourCC: 'axml', label: 'EBU Core XML',        description: 'EBU Core XML – profesionální archivní metadata ve formátu XML' },
];