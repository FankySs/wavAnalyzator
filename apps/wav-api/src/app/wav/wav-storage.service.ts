import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';

@Injectable()
export class WavStorageService {
  constructor(private readonly r2: R2StorageService) {}

  async save(file: Express.Multer.File): Promise<string> {
    // UUID prefix prevents collisions and makes storage keys unguessable
    const key = `${randomUUID()}-${file.originalname}`;
    await this.r2.uploadFile(key, file.buffer, 'audio/wav');
    return key;
  }

  async remove(key: string): Promise<void> {
    await this.r2.deleteFile(key);
  }
}