import path from 'node:path';
import { defineConfig } from 'prisma/config';

const tursoUrl = process.env['TURSO_DATABASE_URL'];
const localDbPath = path.resolve(__dirname, 'apps/wav-api/prisma/dev.db');

export default defineConfig({
  schema: path.resolve(__dirname, 'apps/wav-api/prisma/schema.prisma'),
  datasource: {
    url: tursoUrl ?? `file:${localDbPath}`,
  },
});