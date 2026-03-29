export type WaveformPointDto = {
  min: number; // -1.0 to 0.0
  max: number; //  0.0 to 1.0
};

export type WaveformDto = {
  points: WaveformPointDto[];
  durationSec: number;
  sampleRate: number;
};