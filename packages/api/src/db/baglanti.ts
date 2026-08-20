import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as sema from './sema';

/**
 * Üretim veritabanı bağlantısı. Testlerde PGlite kullanılır (bkz. test/veritabani.ts):
 * aynı şema, aynı SQL, Docker gerektirmeden.
 */

/**
 * Sürücüden bağımsız veritabanı tipi.
 * Üretimde node-postgres, testlerde PGlite — ikisi de bu tabandan türüyor,
 * böylece rota kodu hangi sürücüyle çalıştığını bilmek zorunda kalmıyor.
 */
export type Veritabani = PgDatabase<
  PgQueryResultHKT,
  typeof sema,
  ExtractTablesWithRelations<typeof sema>
>;

export interface BaglantiSecenekleri {
  url: string;
  maksBaglanti?: number;
}

export function veritabaniAc(secenekler: BaglantiSecenekleri): {
  db: Veritabani;
  kapat: () => Promise<void>;
} {
  const havuz = new pg.Pool({
    connectionString: secenekler.url,
    max: secenekler.maksBaglanti ?? 10,
    // Bağlantı sızıntısı sunucuyu sessizce öldürür; erken hata daha iyidir.
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });

  return {
    db: drizzle(havuz, { schema: sema }),
    kapat: () => havuz.end(),
  };
}

export { sema };
