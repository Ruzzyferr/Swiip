import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { yapilandirmayiOku } from '../yapilandirma';

/**
 * Göç çalıştırıcı.
 *
 * Uygulanan göçler `_gocler` tablosunda tutulur; aynı göç iki kez çalışmaz.
 * Her göç kendi işlemi içinde çalışır: yarım uygulanmış şema bırakmaz.
 */

const gocDizini = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'gocler');

export async function gocleriCalistir(url: string): Promise<string[]> {
  const istemci = new pg.Client({ connectionString: url });
  await istemci.connect();

  const uygulananlar: string[] = [];

  try {
    await istemci.query(`
      create table if not exists _gocler (
        ad text primary key,
        uygulandi_at timestamptz not null default now()
      )
    `);

    const { rows } = await istemci.query<{ ad: string }>('select ad from _gocler');
    const mevcut = new Set(rows.map((r) => r.ad));

    const dosyalar = (await readdir(gocDizini)).filter((d) => d.endsWith('.sql')).sort();

    for (const dosya of dosyalar) {
      if (mevcut.has(dosya)) continue;

      const sql = await readFile(join(gocDizini, dosya), 'utf8');

      await istemci.query('begin');
      try {
        for (const ifade of sql.split('--> statement-breakpoint')) {
          const temiz = ifade.trim();
          if (temiz.length > 0) await istemci.query(temiz);
        }
        await istemci.query('insert into _gocler (ad) values ($1)', [dosya]);
        await istemci.query('commit');
        uygulananlar.push(dosya);
      } catch (hata) {
        await istemci.query('rollback');
        throw new Error(`Göç başarısız: ${dosya} — ${hata instanceof Error ? hata.message : hata}`);
      }
    }
  } finally {
    await istemci.end();
  }

  return uygulananlar;
}

const dogrudanCalistirildi = process.argv[1]?.endsWith('goc.ts') === true;

if (dogrudanCalistirildi) {
  const yapilandirma = yapilandirmayiOku();
  gocleriCalistir(yapilandirma.DATABASE_URL)
    .then((uygulananlar) => {
      if (uygulananlar.length === 0) console.log('Göç yok, şema güncel.');
      else console.log(`${uygulananlar.length} göç uygulandı:\n  ${uygulananlar.join('\n  ')}`);
    })
    .catch((hata) => {
      console.error(hata instanceof Error ? hata.message : hata);
      process.exit(1);
    });
}
