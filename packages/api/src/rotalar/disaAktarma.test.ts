import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import * as sema from '../db/sema';
import { coach_messages } from '../db/sema';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * KVKK erişim hakkı: dışa aktarma GERÇEKTEN tüm kişisel veriyi içeriyor mu?
 *
 * Dosya "hakkındaki tüm kişisel verini içerir" diyordu ama koç mesajları, su kayıtları,
 * öğün planları, dolap, kaydırma tercihleri ve tanıma geçmişi yoktu. Koç mesajı en
 * hassası: kullanıcı oraya sağlık şikâyetini yazıyor.
 *
 * Yeni bir tablo eklendiğinde unutulmasın diye kural şemadan okunuyor: `user_id`
 * taşıyan her tablo ya dışa aktarılıyor ya da aşağıda GEREKÇESİYLE muaf.
 */

const MUAF: Record<string, string> = {
  refresh_tokens: 'oturum sırrının özeti; kişiye ait bilgi değil, güvenlik malzemesi',
  dogrulama_kodlari: 'tek kullanımlık kod özeti; güvenlik malzemesi',
  ai_usage: 'maliyet ölçümü; içerik taşımıyor',
  analytics_events: 'terk analizi; kişisel veri taşımıyor (bkz. şema yorumu)',
  ilgi_kayitlari: 'hesapsız site listesi; user_id yok',
  kanca_olaylari: 'mağaza olay tekilleştirmesi; abonelik kaydı zaten dışa aktarılıyor',
};

const KAYNAK = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'hesap.ts'), 'utf8');

let uygulama: TestUygulama;
let app: FastifyInstance;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

describe('dışa aktarma kapsamı', () => {
  it('user_id taşıyan her tablo dışa aktarılıyor ya da gerekçesiyle muaf', () => {
    const eksik: string[] = [];
    for (const deger of Object.values(sema)) {
      if (typeof deger !== 'object' || deger === null || !('getSQL' in deger)) continue;
      let ayar;
      try {
        ayar = getTableConfig(deger as PgTable);
      } catch {
        continue;
      }
      const kullaniciSutunu = ayar.columns.some((c) => c.name === 'user_id');
      if (!kullaniciSutunu || MUAF[ayar.name]) continue;

      const degiskenAdi = Object.entries(sema).find(([, v]) => v === deger)?.[0];
      if (!degiskenAdi || !KAYNAK.includes(`.from(${degiskenAdi})`)) eksik.push(ayar.name);
    }

    expect(eksik, 'dışa aktarılmayan kişisel veri tablosu').toEqual([]);
  });

  it('koç mesajları dosyada yer alıyor', async () => {
    const kayit = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/kayit',
      payload: { email: 'kvkk-koc@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
    });
    const { erisim_token, kullanici } = kayit.json();

    await uygulama.ortam.db
      .insert(coach_messages)
      .values({ user_id: kullanici.id, role: 'user', content: 'Dizim ağrıyor' });

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/hesap/disa-aktar',
      headers: { authorization: `Bearer ${erisim_token}` },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().koc_mesajlari).toHaveLength(1);
    expect(cevap.json().koc_mesajlari[0].content).toBe('Dizim ağrıyor');
  });
});
