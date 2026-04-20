import type { CreateInfoEntryDto } from './list-info-edit.dto';

// ---------------------------------------------------------------------------
// LIST/INFO
// ---------------------------------------------------------------------------

export type CreateListInfoDto = {
  entries: CreateInfoEntryDto[];
};

// ---------------------------------------------------------------------------
// bext (Broadcast Wave Extension)
// ---------------------------------------------------------------------------

/** Pole sdílená oběma variantami bext DTO. */
type BextIdentityFields = {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string; // YYYY-MM-DD
  originationTime: string; // HH:MM:SS
};

/** Při vytváření jsou low/high volitelné – serializér doplní nuly. */
export type CreateBextDto = BextIdentityFields & {
  timeReferenceLow?: number;
  timeReferenceHigh?: number;
};

/** Při editaci je timeReference kombinovaný 64bitový offset (low + high * 2^32). */
export type UpdateBextDto = BextIdentityFields & {
  timeReference: number;
  codingHistory: string;
};

// ---------------------------------------------------------------------------
// cue
// ---------------------------------------------------------------------------

export type CuePointDto = {
  sampleOffset: number;
};

export type CreateCueDto = {
  points: CuePointDto[];
};

/** Create a Update mají stejnou strukturu – cue pointy se vždy nahrazují celé. */
export type UpdateCueDto = CreateCueDto;

// ---------------------------------------------------------------------------
// fact
// ---------------------------------------------------------------------------

export type CreateFactDto = {
  sampleLength: number;
};

/** Create a Update jsou identické – fact obsahuje jediné pole. */
export type UpdateFactDto = CreateFactDto;

// ---------------------------------------------------------------------------
// inst
// ---------------------------------------------------------------------------

export type CreateInstDto = {
  unshiftedNote: number;
  fineTune: number;
  gain: number;
  lowNote: number;
  highNote: number;
  lowVelocity: number;
  highVelocity: number;
};

/** Create a Update jsou identické – inst má pevnou strukturu. */
export type UpdateInstDto = CreateInstDto;

// ---------------------------------------------------------------------------
// smpl
// ---------------------------------------------------------------------------

export type SmplLoopDto = {
  start: number;
  end: number;
  type?: number;      // 0 = forward loop
  playCount?: number; // 0 = infinite
};

export type CreateSmplDto = {
  midiUnityNote: number;  // 0–127
  samplePeriod: number;   // ns per sample (= 1 000 000 000 / sampleRate)
  loops?: SmplLoopDto[];
};

export type UpdateSmplLoopDto = {
  type: number;
  start: number;
  end: number;
  fraction: number;
  playCount: number;
};

export type UpdateSmplDto = {
  midiUnityNote: number;
  midiPitchFraction: number;
  samplePeriod: number;
  smpteFormat: number;
  smpteOffset: number;
  loops: UpdateSmplLoopDto[];
};

// ---------------------------------------------------------------------------
// PEAK
// ---------------------------------------------------------------------------

export type UpdatePeakChannelDto = {
  value: number;
  position: number;
};

export type UpdatePeakDto = {
  channels: UpdatePeakChannelDto[];
};

// ---------------------------------------------------------------------------
// DISP
// ---------------------------------------------------------------------------

export type CreateDispDto = {
  text: string;
};

/** Create a Update jsou identické – DISP obsahuje jediný textový payload. */
export type UpdateDispDto = CreateDispDto;

// ---------------------------------------------------------------------------
// umid
// ---------------------------------------------------------------------------

export type UpdateUmidDto = {
  umid: string; // 128 hex chars = 64 bytes
};

// ---------------------------------------------------------------------------
// cart
// ---------------------------------------------------------------------------

export type CreateCartDto = {
  title: string;
  artist: string;
  category: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endDate: string;
  endTime: string;
  url?: string;
};

export type UpdateCartDto = {
  title: string;
  artist: string;
  cutId: string;
  clientId: string;
  category: string;
  classification: string;
  outCue: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endDate: string;
  endTime: string;
  producerAppId: string;
  producerAppVersion: string;
  userDef: string;
  url: string;
  tag: string;
};

// ---------------------------------------------------------------------------
// ixml / axml
// ---------------------------------------------------------------------------

export type CreateIxmlDto = {
  xml: string;
};

/** Create a Update jsou identické – XML se vždy nahrazuje celé. */
export type UpdateIxmlDto = CreateIxmlDto;

export type CreateAxmlDto = {
  xml: string;
};

/** Create a Update jsou identické – XML se vždy nahrazuje celé. */
export type UpdateAxmlDto = CreateAxmlDto;

// ---------------------------------------------------------------------------
// adtl (Associated Data List)
// ---------------------------------------------------------------------------

export type UpdateAdtlEntryDto = {
  cuePointId: number;
  type: 'labl' | 'note' | 'ltxt';
  text: string;
};

export type CreateAdtlDto = {
  entries: UpdateAdtlEntryDto[];
};

export type UpdateAdtlDto = {
  entries: UpdateAdtlEntryDto[];
};

// ---------------------------------------------------------------------------
// mext (MPEG Audio Extension)
// ---------------------------------------------------------------------------

export type UpdateMextDto = {
  soundInformation: number;
  frameCount: number;
  ancillaryDataLength: number;
  ancillaryDataDef: number;
};

// ---------------------------------------------------------------------------
// levl (Peak Envelope)
// ---------------------------------------------------------------------------

export type UpdateLevlDto = {
  version: number;
  format: number;
  channelCount: number;
  blockSize: number;
};
