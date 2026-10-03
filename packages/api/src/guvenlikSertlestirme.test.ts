import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { uygulamaOlustur } from './uygulama';
import { testVeritabaniAc, type TestOrtami } from './test/veritabani';
import { dogrulama_kodlari, users } from './db/sema';
import { SIFIRLAMA_SINIRI } from './rotalar/kimlik';
import { CEVAP_SINIRLARI } from './rotalar/degerlendirme';
import { GENEL_GOVDE_SINIRI } from './govdeSinirlari';
import { UYGULAMA_ROLU, uygulamaRolunuKur } from './db/uygulamaRolu';

/**
 * 2026-10-03 güvenlik denetiminin kilitleri.
 *
 * İki yarı var. Altyapı yarısı dosyaları okuyor: sertleştirme depoda yazılı ve her
 * dağıtımda yeniden uygulanıyor; bir satır sessizce silinirse burada kırmızı.
 * Uygulama yarısı uçları gerçekten çağırıyor.
 */

const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const oku = (yol: string) => readFileSync(resolve(kok, yol), 'utf8');

/** Compose dosyasından bir servisin bloğu (sonraki servise kadar). */
function servisBlogu(compose: string, ad: string): string {
  const bas = compose.indexOf(`\n  ${ad}:\n`);
  expect(bas, `${ad} servisi yok`).toBeGreaterThan(-1);
  const kalan = compose.slice(bas + 1);
  const son = kalan.slice(3).search(/\n {2}[a-z]\w*:\n|\n[a-z]/);
  return son === -1 ? kalan : kalan.slice(0, son + 3);
}

describe('altyapı: konteynerler', () => {
  const compose = oku('infra/docker-compose.yml');
  const servisler = ['postgres', 'gocmen', 'tohumcu', 'api', 'caddy', 'yedekleyici'];

  it('yalnız caddy port yayınlıyor — Docker yayınları ufw’yu atlar', () => {
    for (const ad of servisler) {
      const blok = servisBlogu(compose, ad);
      if (ad === 'caddy') expect(blok).toMatch(/\n {4}ports:/);
      else expect(blok, `${ad} port yayınlamamalı`).not.toMatch(/\n {4}ports:/);
    }
  });

  it('her servis yetki yükseltemiyor ve günlüğü sınırlı', () => {
    for (const ad of servisler) {
      const blok = servisBlogu(compose, ad);
      const node = /<<: \*node-sertlestirme/.test(blok);
      expect(node || /no-new-privileges:true/.test(blok), `${ad}: no-new-privileges`).toBe(true);
      expect(node || /logging: \*gunluk/.test(blok), `${ad}: günlük sınırı`).toBe(true);
      expect(node || /cap_drop: \[ALL\]/.test(blok), `${ad}: cap_drop`).toBe(true);
    }
    expect(compose).toMatch(/max-size: '10m'/);
  });

  it('Node servisleri salt okunur kök dosya sistemiyle çalışıyor', () => {
    const anchor = compose.slice(
      compose.indexOf('x-node-sertlestirme'),
      compose.indexOf('services:'),
    );
    expect(anchor).toMatch(/read_only: true/);
    expect(anchor).toMatch(/cap_drop: \[ALL\]/);
    expect(anchor).toMatch(/tmpfs:/);
    for (const ad of ['gocmen', 'tohumcu', 'api']) {
      expect(servisBlogu(compose, ad)).toMatch(/<<: \*node-sertlestirme/);
    }
  });

  it('API veritabanına süper kullanıcıyla DEĞİL, uygulama rolüyle bağlanıyor', () => {
    const api = servisBlogu(compose, 'api');
    expect(api).toMatch(new RegExp(`DATABASE_URL: postgres://${UYGULAMA_ROLU}:`));
    expect(api).not.toMatch(/DATABASE_URL: postgres:\/\/\$\{POSTGRES_USER/);
    expect(servisBlogu(compose, 'gocmen')).toMatch(/UYGULAMA_DB_PAROLASI:/);
  });

  it('veritabanı ve uygulama dış ağa açılmıyor', () => {
    expect(compose).toMatch(/ic:\n\s+internal: true/);
    expect(servisBlogu(compose, 'postgres')).toMatch(/networks: \[ic\]/);
  });
});

describe('altyapı: sunucu', () => {
  const betik = oku('scripts/sunucu-sertlestir.sh');
  const dagit = oku('scripts/sunucu-dagit.sh');

  it('dağıtım sertleştirmeyi konteynerlerden ÖNCE çalıştırıyor', () => {
    const sert = dagit.indexOf('bash scripts/sunucu-sertlestir.sh');
    expect(sert).toBeGreaterThan(-1);
    expect(sert).toBeLessThan(dagit.indexOf('docker compose -f infra/docker-compose.yml build'));
  });

  it.each([
    ['parola ile SSH kapalı', /^PasswordAuthentication no$/m],
    ['root yalnız anahtarla', /^PermitRootLogin prohibit-password$/m],
    ['yalnız açık anahtar', /^AuthenticationMethods publickey$/m],
    ['deneme sınırı', /^MaxAuthTries 3$/m],
    ['sshd doğrulanmadan yüklenmiyor', /if sshd -t; then/],
    ['fail2ban', /\[sshd\]\nenabled = true/],
    ['güncellemeden sonra yeniden başlatma', /Automatic-Reboot "true"/],
    ['yönlendirme kabul edilmiyor', /accept_redirects = 0/],
    ['yedek dizini yalnız root', /chmod 700 "\$UZAK_DIZIN\/yedekler"/],
    ['ufw ufw limit kullanmıyor', /^(?![\s\S]*ufw limit )/],
  ])('%s', (_ad, desen) => {
    expect(betik).toMatch(desen);
  });

  it('yedek dosyaları yalnız sahibinin okuyacağı izinle yazılıyor', () => {
    expect(oku('scripts/yedek-al.sh')).toMatch(/^umask 077$/m);
  });

  it('vekil: güvenlik başlıkları, gövde sınırı ve yöntem süzgeci', () => {
    const caddy = oku('infra/Caddyfile');
    expect(caddy).toMatch(/Content-Security-Policy "default-src 'self'; script-src 'self';/);
    expect(caddy).toMatch(/frame-ancestors 'none'/);
    expect(caddy).toMatch(/Strict-Transport-Security/);
    expect(caddy).toMatch(/request_body \{\s+max_size 15MB/);
    expect(caddy).toMatch(/@yasakYontem not method/);
  });
});

describe('veritabanı: uygulama rolü', () => {
  let db: PGlite;

  beforeAll(async () => {
    const ortam = await testVeritabaniAc();
    // testVeritabaniAc drizzle döndürüyor; rolü ham istemciyle sınamak için ayrı örnek.
    await ortam.kapat();
    db = new PGlite();
    await db.exec('create table _gocler (ad text primary key)');
    await db.exec('create table users (id serial primary key, email text)');
    await uygulamaRolunuKur(db, 'a'.repeat(48));
    // İdempotent: ikinci koşu hata vermemeli.
    await uygulamaRolunuKur(db, 'b'.repeat(48));
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('süper kullanıcı değil, rol veya veritabanı kuramıyor', async () => {
    const { rows } = await db.query<{
      rolsuper: boolean;
      rolcreaterole: boolean;
      rolcreatedb: boolean;
    }>('select rolsuper, rolcreaterole, rolcreatedb from pg_roles where rolname = $1', [
      UYGULAMA_ROLU,
    ]);
    expect(rows[0]).toEqual({ rolsuper: false, rolcreaterole: false, rolcreatedb: false });
  });

  it('veri okuyup yazabiliyor, şema değiştiremiyor, göç kaydına yazamıyor', async () => {
    await db.exec(`set role ${UYGULAMA_ROLU}`);
    try {
      await db.query("insert into users (email) values ('a@b.c')");
      expect((await db.query('select count(*)::int as n from users')).rows).toEqual([{ n: 1 }]);
      await expect(db.exec('create table kotu (x int)')).rejects.toThrow();
      await expect(db.exec('drop table users')).rejects.toThrow();
      await expect(db.query("insert into _gocler (ad) values ('sahte')")).rejects.toThrow();
    } finally {
      await db.exec('reset role');
    }
  });

  it('geçersiz parolayı reddediyor (metne gömülüyor, yalnız harf ve rakam)', async () => {
    await expect(uygulamaRolunuKur(db, "kisa'; drop table users; --")).rejects.toThrow();
  });
});

describe('uygulama uçları', () => {
  let ortam: TestOrtami;
  let app: FastifyInstance;

  beforeAll(async () => {
    ortam = await testVeritabaniAc();
    app = await uygulamaOlustur({
      db: ortam.db,
      yapilandirma: {
        NODE_ENV: 'test',
        PORT: 0,
        HOST: '127.0.0.1',
        DATABASE_URL: 'pglite://bellek',
        JWT_SECRET: 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
        ERISIM_TOKEN_OMRU: '15m',
        YENILEME_TOKEN_GUN: 30,
        POSTA_GONDEREN: 'Swiip <test@swiip.app>',
        KIMLIK_ISTEK_SINIRI: 1000,
        LOG_SEVIYESI: 'fatal',
        CORS_KAYNAKLAR: '*',
      },
    });
    await app.ready();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await ortam?.kapat();
  });

  async function kayit(email: string) {
    const yanit = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/kayit',
      payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
    });
    expect(yanit.statusCode).toBe(201);
    return (yanit.json() as { erisim_token: string }).erisim_token;
  }

  it('kimliksiz uç büyük gövdeyi doğrulamadan reddediyor (413)', async () => {
    const yanit = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'x@y.z', parola: 'a'.repeat(GENEL_GOVDE_SINIRI + 10) }),
    });
    expect(yanit.statusCode).toBe(413);
  });

  it('X-Forwarded-For sahteciliği istek sınırını aşamıyor', async () => {
    // İstemcinin yazdığı sol girdiler değişiyor; Caddy'nin eklediği son girdi aynı.
    const sinirli = await uygulamaOlustur({
      db: ortam.db,
      yapilandirma: { ...app.yapilandirma, KIMLIK_ISTEK_SINIRI: 2 },
    });
    try {
      const kodlar: number[] = [];
      for (let i = 0; i < 4; i++) {
        const y = await sinirli.inject({
          method: 'POST',
          url: '/v1/kimlik/giris',
          headers: { 'x-forwarded-for': `10.0.0.${i}, 203.0.113.7` },
          payload: { email: 'yok@swiip.app', parola: 'yanlis-parola-1' },
        });
        kodlar.push(y.statusCode);
      }
      expect(kodlar.slice(2)).toEqual([429, 429]);
    } finally {
      await sinirli.close();
    }
  });

  it('aynı adresten saatlik kayıt sınırı', async () => {
    const sinirli = await uygulamaOlustur({
      db: ortam.db,
      yapilandirma: { ...app.yapilandirma, KAYIT_SAATLIK_SINIRI: 2 },
    });
    try {
      const kodlar: number[] = [];
      for (let i = 0; i < 3; i++) {
        const y = await sinirli.inject({
          method: 'POST',
          url: '/v1/kimlik/kayit',
          payload: {
            email: `seri${i}@swiip.app`,
            parola: 'Kirmizi-Bisiklet-42',
            saglik_onayi: true,
          },
        });
        kodlar.push(y.statusCode);
      }
      expect(kodlar).toEqual([201, 201, 429]);
    } finally {
      await sinirli.close();
    }
  });

  it(`parola sıfırlama: hesap başına saatte ${SIFIRLAMA_SINIRI.saatlik} kod, yanıt değişmiyor`, async () => {
    const email = 'sifirla@swiip.app';
    await kayit(email);
    const yanitlar = [];
    for (let i = 0; i < SIFIRLAMA_SINIRI.saatlik + 2; i++) {
      const y = await app.inject({
        method: 'POST',
        url: '/v1/kimlik/parola-sifirla-istek',
        payload: { email },
      });
      yanitlar.push(y.json());
    }
    // Sınırdaki yanıt öncekilerle AYNI: aksi, adresin kayıtlı olduğunu ele verirdi.
    expect(new Set(yanitlar.map((y) => JSON.stringify(y))).size).toBe(1);

    const [k] = await ortam.db.select({ id: users.id }).from(users).where(eq(users.email, email));
    const kodlar = await ortam.db
      .select()
      .from(dogrulama_kodlari)
      .where(eq(dogrulama_kodlari.user_id, k!.id));
    expect(kodlar).toHaveLength(SIFIRLAMA_SINIRI.saatlik);
  });

  it('değerlendirme cevabı sınırsız anahtar biriktiremiyor', async () => {
    const token = await kayit('cevap@swiip.app');
    const cevaplar = Object.fromEntries(
      Array.from({ length: CEVAP_SINIRLARI.anahtar + 1 }, (_, i) => [`cop_${i}`, 'x']),
    );
    const y = await app.inject({
      method: 'POST',
      url: '/v1/degerlendirme/cevap',
      headers: { authorization: `Bearer ${token}` },
      payload: { cevaplar },
    });
    expect(y.statusCode).toBe(400);
  });

  it('barkod yalnız rakam kabul ediyor', async () => {
    const token = await kayit('barkod@swiip.app');
    const y = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/barkod/abc%27%3B--x',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(y.statusCode).toBe(400);
  });

  it('mağaza dışı plan yükseltme, NODE_ENV açıkça verilmezse kapalı', async () => {
    const token = await kayit('pro@swiip.app');
    const onceki = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      const y = await app.inject({
        method: 'POST',
        url: '/v1/abonelik/guncelle',
        headers: { authorization: `Bearer ${token}` },
        payload: { plan: 'pro' },
      });
      expect(y.statusCode).toBe(403);
    } finally {
      process.env.NODE_ENV = onceki;
    }
  });
});
