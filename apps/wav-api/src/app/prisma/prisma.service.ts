import path from 'node:path';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

function createAdapter(config: ConfigService): PrismaLibSql {
  const tursoUrl = config.get<string>('TURSO_DATABASE_URL');
  if (tursoUrl) {
    return new PrismaLibSql({
      url: tursoUrl,
      authToken: config.get<string>('TURSO_AUTH_TOKEN'),
    });
  }
  const dbPath = path.join(process.cwd(), 'apps/wav-api/prisma/dev.db');
  return new PrismaLibSql({ url: `file:${dbPath}` });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({ adapter: createAdapter(config) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}