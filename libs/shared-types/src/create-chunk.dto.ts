import type { CreateInfoEntryDto } from './list-info-edit.dto';

export type CreateListInfoDto = {
  entries: CreateInfoEntryDto[];
};

export type CreateBextDto = {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string; // YYYY-MM-DD
  originationTime: string; // HH:MM:SS
  timeReferenceLow?: number;
  timeReferenceHigh?: number;
};

export type UpdateBextDto = {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string; // YYYY-MM-DD
  originationTime: string; // HH:MM:SS
  timeReference: number;   // combined 64-bit sample offset (low + high * 2^32)
  codingHistory: string;
};

export type CuePointDto = {
  sampleOffset: number;
};

export type CreateCueDto = {
  points: CuePointDto[];
};

export type CreateFactDto = {
  sampleLength: number;
};

export type CreateInstDto = {
  unshiftedNote: number;
  fineTune: number;
  gain: number;
  lowNote: number;
  highNote: number;
  lowVelocity: number;
  highVelocity: number;
};

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

export type CreateDispDto = {
  text: string;
};

export type CreateIxmlDto = {
  xml: string;
};

export type CreateAxmlDto = {
  xml: string;
};

export type CreateAdtlDto = {
  entries: UpdateAdtlEntryDto[];
};

export type UpdateAdtlEntryDto = {
  cuePointId: number;
  type: 'labl' | 'note' | 'ltxt';
  text: string;
};

export type UpdateAdtlDto = {
  entries: UpdateAdtlEntryDto[];
};

export type UpdateMextDto = {
  soundInformation: number;
  frameCount: number;
  ancillaryDataLength: number;
  ancillaryDataDef: number;
};

export type UpdateLevlDto = {
  version: number;
  format: number;
  channelCount: number;
  blockSize: number;
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

export type UpdateIxmlDto = {
  xml: string;
};

export type UpdateAxmlDto = {
  xml: string;
};

export type UpdateCueDto = {
  points: CuePointDto[];
};

export type UpdateFactDto = {
  sampleLength: number;
};

export type UpdatePeakChannelDto = {
  value: number;
  position: number;
};

export type UpdatePeakDto = {
  channels: UpdatePeakChannelDto[];
};

export type UpdateDispDto = {
  text: string;
};

export type UpdateUmidDto = {
  umid: string; // 128 hex chars = 64 bytes
};

export type UpdateInstDto = {
  unshiftedNote: number;
  fineTune: number;
  gain: number;
  lowNote: number;
  highNote: number;
  lowVelocity: number;
  highVelocity: number;
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
