import pg from 'pg';

/**
 * API'nin veritabanı rolü: yalnız veri okur ve yazar.
 *
 * 2026-10-03 denetimine kadar API, Postgres'e kümenin TEK rolüyle — süper kullanıcı
 * `swiip` — bağlanıyordu. Süper kullanıcı bağlantısında tek bir SQL enjeksiyonu
 * veritabanıyla sınırlı kalmaz: `COPY ... TO PROGRAM` konteynerde komut çalıştırır,
 * `pg_read_server_files` dosya okur, rol ve veritabanı silinebilir.
 *
 * Bu rolün yapabildikleri: tablolarda SELECT/INSERT/UPDATE/DELETE, dizilerde
 * USAGE/SELECT, danışma kilidi (`vucutRezerve.ts`, her role açık). Yapamadıkları:
 * şema değiştirmek, rol kurmak, veritabanı açmak, sunucu dosyası okumak, program
 * çalıştırmak, göç kaydını (`_gocler`) değiştirmek.
 *
 * Göçler ve tohumlama hâlâ sahip rolle çalışıyor (`gocmen`, `tohumcu`). Bu fonksiyon
 * her göç koşusunun sonunda çağrılıyor ve idempotent: yeni bir göçün eklediği tablo
 * hem varsayılan yetkiyle hem de buradaki yeniden verme ile kapsanıyor.
 */

export const UYGULAMA_ROLU = 'swiip_uygulama';

/** Parola yalnızca hex/alfanümerik: ALTER ROLE parametre almıyor, değer metne gömülüyor. */
const GECERLI_PAROLA = /^[A-Za-z0-9]{32,128}$/;

/** `pg.Client` ve testteki PGlite'ın ortak yüzü. */
export interface Sorgulayici {
  query: (metin: string, degerler?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export async function uygulamaRolunuKur(istemci: Sorgulayici, parola: string): Promise<void> {
  if (!GECERLI_PAROLA.test(parola)) {
    throw new Error('UYGULAMA_DB_PAROLASI 32-128 karakter, yalnız harf ve rakam olmalı.');
  }

  const { rows } = await istemci.query('select current_database() as db, current_user as sahip');
  const { db, sahip } = rows[0] as { db: string; sahip: string };
  const id = (ad: string) => pg.escapeIdentifier(ad);
  const rol = id(UYGULAMA_ROLU);

  await istemci.query('begin');
  try {
    const var_ = await istemci.query('select 1 from pg_roles where rolname = $1', [UYGULAMA_ROLU]);
    if (var_.rows.length === 0) await istemci.query(`create role ${rol} login`);

    await istemci.query(
      `alter role ${rol} with login nosuperuser nocreatedb nocreaterole noreplication ` +
        `nobypassrls inherit connection limit 50 password ${pg.escapeLiteral(parola)}`,
    );
    // Uzun süren tek bir sorgu bağlantı havuzunu kilitlemesin.
    await istemci.query(`alter role ${rol} set statement_timeout = '30s'`);
    await istemci.query(`alter role ${rol} set idle_in_transaction_session_timeout = '60s'`);

    // Herkese açık varsayılanları kapat: başka bir rol bu veritabanına bağlanamasın,
    // public şemasına nesne kuramasın.
    await istemci.query(`revoke all on database ${id(db)} from public`);
    await istemci.query(`revoke create on schema public from public`);

    await istemci.query(`grant connect, temporary on database ${id(db)} to ${rol}`);
    await istemci.query(`grant usage on schema public to ${rol}`);
    await istemci.query(
      `grant select, insert, update, delete on all tables in schema public to ${rol}`,
    );
    await istemci.query(`grant usage, select on all sequences in schema public to ${rol}`);
    await istemci.query(
      `alter default privileges for role ${id(sahip)} in schema public ` +
        `grant select, insert, update, delete on tables to ${rol}`,
    );
    await istemci.query(
      `alter default privileges for role ${id(sahip)} in schema public ` +
        `grant usage, select on sequences to ${rol}`,
    );

    // Göç kaydı uygulamanın işi değil: okuyabilir, değiştiremez.
    await istemci.query(`revoke insert, update, delete on table _gocler from ${rol}`);

    await istemci.query('commit');
  } catch (hata) {
    await istemci.query('rollback');
    throw hata;
  }
}
