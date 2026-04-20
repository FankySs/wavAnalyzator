import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WavStorageService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  async save(file: Express.Multer.File): Promise<string> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    // UUID prefix zabraňuje kolizím při nahrání dvou souborů se stejným názvem
    // a zároveň znemožňuje hádání cesty k souboru podle původního jména.
    const uniqueName = `${randomUUID()}-${file.originalname}`;
    const filePath = path.join(this.uploadsDir, uniqueName);
    await fs.writeFile(filePath, file.buffer);
    return filePath;
  }

  async remove(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore – soubor nemusel být uložen
    }
  }
}
