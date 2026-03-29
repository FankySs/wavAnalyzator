import path from 'node:path';
import { defineConfig } from 'prisma/config';

// To switch to PostgreSQL: update url to env("DATABASE_URL") with a postgres connection string
const dbPath = path.resolve(__dirname, 'apps/wav-api/prisma/dev.db');

export default defineConfig({
  schema: path.resolve(__dirname, 'apps/wav-api/prisma/schema.prisma'),
  datasource: {
    url: `file:${dbPath}`,
  },
});
