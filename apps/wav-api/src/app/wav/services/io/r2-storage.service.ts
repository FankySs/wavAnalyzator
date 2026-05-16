import path from 'node:path';
import * as fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import { Readable } from 'node:stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly localDir: string;
  readonly isLocal: boolean;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    this.bucket = config.get<string>('R2_BUCKET_NAME', 'wav-files');
    this.localDir = path.join(process.cwd(), config.get<string>('UPLOAD_DIR', 'uploads'));
    this.isLocal = !accountId;

    if (!this.isLocal) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
          secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
        },
      });
      this.logger.log(`R2 storage ready (bucket: ${this.bucket})`);
    } else {
      this.logger.log(`Local disk storage ready (dir: ${this.localDir})`);
    }
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
    if (this.isLocal) {
      await fsPromises.mkdir(this.localDir, { recursive: true });
      await fsPromises.writeFile(path.join(this.localDir, key), buffer);
      return;
    }
    await this.s3!.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType }),
    );
  }

  async downloadFile(key: string): Promise<Buffer> {
    if (this.isLocal) {
      return fsPromises.readFile(path.join(this.localDir, key));
    }
    const res = await this.s3!.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async downloadFileRange(key: string, start: number, end: number): Promise<Buffer> {
    if (this.isLocal) {
      const length = end - start + 1;
      const buf = Buffer.alloc(length);
      const fd = fs.openSync(path.join(this.localDir, key), 'r');
      try {
        fs.readSync(fd, buf, 0, length, start);
      } finally {
        fs.closeSync(fd);
      }
      return buf;
    }
    const res = await this.s3!.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=${start}-${end}` }),
    );
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async createReadStream(key: string, start?: number, end?: number): Promise<Readable> {
    if (this.isLocal) {
      const opts = start !== undefined ? { start, end } : undefined;
      return fs.createReadStream(path.join(this.localDir, key), opts);
    }
    const range = start !== undefined ? `bytes=${start}-${end ?? ''}` : undefined;
    const res = await this.s3!.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }),
    );
    return res.Body as unknown as Readable;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.isLocal) {
      return `/api/wav/${key}/stream`;
    }
    return s3GetSignedUrl(this.s3!, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isLocal) {
      try {
        await fsPromises.unlink(path.join(this.localDir, key));
      } catch {
        // ignore missing files
      }
      return;
    }
    try {
      await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // ignore
    }
  }
}