import { Injectable, BadRequestException } from '@nestjs/common';

// ROZŠÍŘENÍ O DALŠÍ FORMÁTY – bod 1/2 (MIME type):
// Pro podporu dalších formátů (MP3, FLAC, AIFF…) přidej jejich MIME typy do tohoto Setu
// a uprav nebo vyměň validaci níže za detekci formátu podle magic bytes.
const ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'application/octet-stream', // někteří klienti posílají binární MIME bez rozlišení
]);

@Injectable()
export class WavValidatorService {
  validate(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Neplatný MIME type: "${file.mimetype}". Očekáváno audio/wav.`,
      );
    }

    if (file.buffer.length < 12) {
      throw new BadRequestException('Soubor je příliš malý pro validní WAV soubor (min. 12 B).');
    }

    // ROZŠÍŘENÍ O DALŠÍ FORMÁTY – bod 2/2 (magic bytes):
    // Zde se provádí detekce formátu čtením prvních bajtů souboru (tzv. magic bytes).
    // WAV = RIFF....WAVE | MP3 = ID3 nebo 0xFF 0xFB | FLAC = fLaC | AIFF = FORM....AIFF
    // Pro více formátů by tato metoda vracela rozpoznaný typ (enum AudioFormat)
    // a caller (WavService.upload) by podle něj zvolil správný parser a service.
    const riff = file.buffer.toString('ascii', 0, 4);
    if (riff !== 'RIFF') {
      throw new BadRequestException(
        'Soubor není platný WAV soubor – chybí RIFF hlavička (první 4 bajty).',
      );
    }

    const wave = file.buffer.toString('ascii', 8, 12);
    if (wave !== 'WAVE') {
      throw new BadRequestException(
        'Soubor není platný WAVE soubor – chybí WAVE identifikátor (bajty 8–11).',
      );
    }
  }
}
