import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as sema from '../db/sema';

/**
 * Test veritabanı: PGlite ile bellek içinde gerçek Postgres.
 *
 * Sahte bir katman değil — üretimdeki göçlerin aynısı çalıştırılır. Böylece testler
 * "kod çalışıyor mu"yu değil "şema ve SQL gerçekten çalışıyor mu"yu doğrular.
 */

const gocDizini = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'gocler');

export type TestVeritabani = ReturnType<typeof drizzle<typeof sema>>;

export interface TestOrtami {
  db: TestVeritabani;
  kapat: () => Promise<void>;
}

export async function testVeritabaniAc(): Promise<TestOrtami> {
  const istemci = new PGlite();
  const db = drizzle(istemci, { schema: sema });

  await gocleriUygula(istemci);

  return {
    db,
    kapat: async () => {
      await istemci.close();
    },
  };
}

async function gocleriUygula(istemci: PGlite): Promise<void> {
  const dosyalar = (await readdir(gocDizini)).filter((d) => d.endsWith('.sql')).sort();

  for (const dosya of dosyalar) {
    const sql = await readFile(join(gocDizini, dosya), 'utf8');
    // Drizzle göç dosyaları ifadeleri bu ayraçla böler.
    for (const ifade of sql.split('--> statement-breakpoint')) {
      const temiz = ifade.trim();
      if (temiz.length > 0) await istemci.exec(temiz);
    }
  }
}
