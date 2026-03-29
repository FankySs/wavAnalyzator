/**
 * Converts a sample offset to a time string in "mm:ss.mmm" format.
 */
export function samplesToTime(samples: number, sampleRate: number): string {
  if (sampleRate <= 0) return '00:00.000';
  const totalMs = Math.round((samples / sampleRate) * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Parses a time string ("mm:ss", "mm:ss.mmm", "hh:mm:ss", "hh:mm:ss.mmm")
 * and converts to a sample count.
 */
export function timeToSamples(time: string, sampleRate: number): number {
  const parts = time.trim().split(':');
  if (parts.length < 2) return 0;

  let minutes: number;
  let sec: number;
  let ms: number;

  if (parts.length === 2) {
    minutes = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split('.');
    sec = parseInt(secParts[0], 10) || 0;
    ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
  } else {
    const h = parseInt(parts[0], 10) || 0;
    minutes = h * 60 + (parseInt(parts[1], 10) || 0);
    const secParts = parts[2].split('.');
    sec = parseInt(secParts[0], 10) || 0;
    ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
  }

  const totalSec = minutes * 60 + sec + ms / 1000;
  return Math.round(totalSec * sampleRate);
}