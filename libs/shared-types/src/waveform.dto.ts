export type WaveformPointDto = {
  min: number; // -1.0 to 0.0
  max: number; //  0.0 to 1.0
};

export type WaveformChannelDto = {
  points: WaveformPointDto[];
};

export type WaveformDto = {
  channels: WaveformChannelDto[]; // one entry per audio channel
  durationSec: number;
  sampleRate: number;
};