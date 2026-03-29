import path from 'node:path';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

function createPrismaAdapter(): PrismaLibSql {
  const dbPath = path.join(process.cwd(), 'apps/wav-api/prisma/dev.db');
  return new PrismaLibSql({ url: `file:${dbPath}` });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createPrismaAdapter() });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
