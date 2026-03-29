const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Converts a MIDI note number (0–127) to a note name string, e.g. 60 → "C4", 69 → "A4", 0 → "C-1". */
export function midiNoteToName(note: number): string {
  const name = NOTE_NAMES[note % 12];
  const octave = Math.floor(note / 12) - 1;
  return `${name}${octave}`;
}