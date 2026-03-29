import { midiNoteToName } from './midi.utils';

describe('midiNoteToName', () => {
  it('should convert middle C (60) to C4', () => {
    expect(midiNoteToName(60)).toBe('C4');
  });

  it('should convert A4 (69) correctly', () => {
    expect(midiNoteToName(69)).toBe('A4');
  });

  it('should convert lowest note (0) to C-1', () => {
    expect(midiNoteToName(0)).toBe('C-1');
  });

  it('should convert highest note (127) to G9', () => {
    expect(midiNoteToName(127)).toBe('G9');
  });

  it('should convert C3 (48) correctly', () => {
    expect(midiNoteToName(48)).toBe('C3');
  });

  it('should convert sharps correctly', () => {
    expect(midiNoteToName(61)).toBe('C#4');
    expect(midiNoteToName(70)).toBe('A#4');
  });
});