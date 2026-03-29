export type WavChunkDto = {
  id: string;
  chunkId: string; // 4CC identifier ('fmt ', 'data', 'LIST', ...)
  offset: number;
  payloadOffset: number;
  size: number;
  isAudioData: boolean;
};

// --- Parsed chunk data variants ---

export type FmtExtensible = {
  cbSize: number;
  validBitsPerSample?: number;
  channelMask?: number;
  subFormatGuid?: string;
};

export type FmtParsed = {
  chunkType: 'fmt';
  audioFormat: number;
  audioFormatName: string; // e.g. 'PCM', 'IEEE_FLOAT', 'EXTENSIBLE'
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  extensible?: FmtExtensible;
};

export type InfoEntryParsed = {
  id: string;  // 4CC subchunk id, e.g. INAM, IART, ICMT
  value: string;
};

export type ListInfoParsed = {
  chunkType: 'LIST_INFO';
  entries: InfoEntryParsed[];
};

export type BextParsed = {
  chunkType: 'bext';
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string;
  originationTime: string;
  timeReferenceLow: number;
  timeReferenceHigh: number;
  version: number;
  umid: string; // 64 bytes as hex string
  loudnessValue?: number;       // in 0.01 LUFS (v2+)
  loudnessRange?: number;
  maxTruePeakLevel?: number;
  maxMomentaryLoudness?: number;
  maxShortTermLoudness?: number;
  codingHistory?: string;       // variable-length, offset 602+
};

export type SmplLoop = {
  cuePointId: number;
  type: number;
  start: number;
  end: number;
  fraction: number;
  playCount: number;
};

export type SmplParsed = {
  chunkType: 'smpl';
  manufacturer: number;
  product: number;
  samplePeriod: number;
  midiUnityNote: number;
  midiPitchFraction: number;
  smpteFormat: number;
  smpteOffset: number;
  loops: SmplLoop[];
};

export type CuePoint = {
  id: number;
  position: number;
  dataChunkId: string;
  chunkStart: number;
  blockStart: number;
  sampleOffset: number;
};

export type CueParsed = {
  chunkType: 'cue';
  points: CuePoint[];
};

export type FactParsed = {
  chunkType: 'fact';
  sampleLength: number;
};

export type PeakChannel = {
  value: number;   // peak value (float32)
  position: number; // sample position
};

export type PeakParsed = {
  chunkType: 'peak';
  version: number;
  timeStamp: number;
  channels: PeakChannel[];
};

export type InstParsed = {
  chunkType: 'inst';
  unshiftedNote: number;
  fineTune: number;
  gain: number;
  lowNote: number;
  highNote: number;
  lowVelocity: number;
  highVelocity: number;
};

export type AdtlEntry = {
  id: string;        // 4CC: 'labl', 'note', 'ltxt'
  cuePointId: number;
  text?: string;
  sampleLength?: number; // ltxt only
  purposeId?: string;    // ltxt only
};

export type AdtlParsed = {
  chunkType: 'adtl';
  entries: AdtlEntry[];
};

export type CartParsed = {
  chunkType: 'cart';
  version: string;
  title: string;
  artist: string;
  cutId: string;
  clientId: string;
  category: string;
  classification: string;
  outCue: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  producerAppId: string;
  producerAppVersion: string;
  userDef: string;
  levelReference: number;
  url: string;
  tag?: string;
};

export type AxmlParsed = {
  chunkType: 'axml';
  xml: string;
};

export type IxmlParsed = {
  chunkType: 'ixml';
  xml: string;
};

export type JunkParsed = {
  chunkType: 'junk';
  byteCount: number;
};

export type MextParsed = {
  chunkType: 'mext';
  soundInformation: number;   // bit flags (uint16)
  frameCount: number;         // počet snímků (uint16)
  ancillaryDataLength: number; // délka doplňkových dat (uint16)
  ancillaryDataDef: number;   // definice doplňkových dat (uint16)
};

export type LevlParsed = {
  chunkType: 'levl';
  version: number;
  format: number;
  pointsPerValue: number;
  blockSize: number;
  channels: number;
  frameCount: number;
  positionFrames: number;
  roomType: string;
};

export type UmidParsed = {
  chunkType: 'umid';
  umidHex: string; // 64 bytes as hex
};

export type DispParsed = {
  chunkType: 'DISP';
  cfType: number;
  text: string;
};

export type Id3Parsed = {
  chunkType: 'ID3';
  rawHex: string; // first 256 bytes as hex
};

export type UnknownParsed = {
  chunkType: 'unknown';
  rawHex: string; // first 256 bytes as hex
};

export type ParsedChunkData =
  | FmtParsed
  | ListInfoParsed
  | BextParsed
  | SmplParsed
  | CueParsed
  | FactParsed
  | PeakParsed
  | InstParsed
  | AdtlParsed
  | CartParsed
  | AxmlParsed
  | IxmlParsed
  | JunkParsed
  | MextParsed
  | LevlParsed
  | UmidParsed
  | DispParsed
  | Id3Parsed
  | UnknownParsed;

export type WavChunkDetailDto = WavChunkDto & {
  parsed: ParsedChunkData | null;
};
