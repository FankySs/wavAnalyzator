import { Injectable, BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'application/octet-stream',
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
