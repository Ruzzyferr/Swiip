import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/sema.ts',
  out: './gocler',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://swiip:swiip@localhost:5432/swiip',
  },
  verbose: true,
  strict: true,
});
