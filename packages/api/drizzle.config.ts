import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/sema.ts',
  out: './gocler',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://made2fit:made2fit@localhost:5432/made2fit',
  },
  verbose: true,
  strict: true,
});
