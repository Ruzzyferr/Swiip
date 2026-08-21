import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { users, body_analyses, session_items, sessions, quotas, decisions } from './sema';

let ortam: TestOrtami;

beforeAll(async () => {
  ortam = await testVeritabaniAc();
}, 60_000);

afterAll(async () => {
  await ortam?.kapat();
});

async function kullaniciEkle(email = 'test@swiip.app'): Promise<string> {
  const [kullanici] = await ortam.db
    .insert(users)
    .values({ email, parola_hash: 'scrypt$x' })
    .returning({ id: users.id });
  return kullanici!.id;
}

describe('şema — göçler', () => {
  it('tüm tablolar oluşur', async () => {
    const sonuc = await ortam.db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const tablolar = sonuc.rows.map((r) => r.table_name);

    for (const beklenen of [
      'users',
      'assessments',
      'profiles',
      'body_analyses',
      'programs',
      'sessions',
      'session_items',
      'progression_state',
      'decisions',
      'foods',
      'food_logs',
      'subscriptions',
      'quotas',
      'ai_usage',
    ]) {
      expect(tablolar, `${beklenen} tablosu yok`).toContain(beklenen);
    }
  });
});

describe('gizlilik mimarisi — şema düzeyinde garanti', () => {
  it('body_analyses tablosunda fotoğraf alanı YOKTUR', async () => {
    const sonuc = await ortam.db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_name = 'body_analyses'`,
    );
    const kolonlar = sonuc.rows.map((r) => r.column_name.toLowerCase());

    for (const yasak of ['photo', 'foto', 'image', 'resim', 'gorsel_veri', 'blob', 'base64']) {
      expect(
        kolonlar.some((k) => k.includes(yasak)),
        `body_analyses.${yasak} olmamalı`,
      ).toBe(false);
    }
  });

  it('hiçbir tabloda fotoğraf içeriği saklayan alan yoktur', async () => {
    const sonuc = await ortam.db.execute<{ table_name: string; column_name: string }>(
      sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
    );

    const supheli = sonuc.rows.filter(
      (r) =>
        /photo|foto|image|resim/i.test(r.column_name) &&
        // Sayaç ve onay alanları içerik taşımaz.
        !/hash|url|onay|consent|_used|_count/i.test(r.column_name),
    );

    expect(supheli.map((s) => `${s.table_name}.${s.column_name}`)).toEqual([]);
  });

  it('food_logs yalnızca fotoğrafın parmak izini tutar', async () => {
    const sonuc = await ortam.db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_name = 'food_logs' and column_name like '%photo%'`,
    );

    expect(sonuc.rows.map((r) => r.column_name)).toEqual(['photo_hash']);
  });

  it('session_items set bazlı gerçekleşme tutmaz', async () => {
    const sonuc = await ortam.db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_name = 'session_items'`,
    );
    const kolonlar = sonuc.rows.map((r) => r.column_name);

    // Hedef değerler var, gerçekleşen set kaydı yok — spec bölüm 7.
    expect(kolonlar).toContain('target_sets');
    expect(kolonlar.some((k) => /completed_sets|actual_reps|set_log/.test(k))).toBe(false);
  });
});

describe('veri bütünlüğü', () => {
  it('kullanıcı silinince analizleri de silinir', async () => {
    const userId = await kullaniciEkle('silinecek@swiip.app');
    await ortam.db.insert(body_analyses).values({ user_id: userId, yontem: 'olcu' });

    await ortam.db.delete(users).where(eq(users.id, userId));

    const kalan = await ortam.db
      .select()
      .from(body_analyses)
      .where(eq(body_analyses.user_id, userId));
    expect(kalan).toHaveLength(0);
  });

  it('aynı e-posta iki kez kaydedilemez', async () => {
    await kullaniciEkle('tekil@swiip.app');

    await expect(kullaniciEkle('tekil@swiip.app')).rejects.toThrow();
  });

  it('e-posta büyük/küçük harf farkı yeni hesap açmaz', async () => {
    await kullaniciEkle('Buyuk@Swiip.app');

    await expect(kullaniciEkle('buyuk@swiip.app')).rejects.toThrow();
  });

  it('kota kaydı kullanıcı ve dönem başına tektir', async () => {
    const userId = await kullaniciEkle('kota@swiip.app');
    await ortam.db.insert(quotas).values({ user_id: userId, period: '2026-08' });

    await expect(
      ortam.db.insert(quotas).values({ user_id: userId, period: '2026-08' }),
    ).rejects.toThrow();
  });

  it('karar kaydı kural ve girdi listesini saklar', async () => {
    const userId = await kullaniciEkle('karar@swiip.app');
    await ortam.db.insert(decisions).values({
      user_id: userId,
      entity_type: 'hareket',
      entity_id: 'hip-thrust',
      rule_fired: ['eksenel_yuk_yasak'],
      inputs_jsonb: [{ soru_id: 'S17', deger: 'Bel fıtığı' }],
      explanation_tr: 'Bel bölgende ağrı bildirdin.',
    });

    const [kayit] = await ortam.db.select().from(decisions).where(eq(decisions.user_id, userId));

    expect(kayit!.rule_fired).toEqual(['eksenel_yuk_yasak']);
    expect(kayit!.explanation_tr).toContain('bildirdin');
  });

  it('seans kalemi olmayan hareket id kabul eder — katalog kodda tutulur', async () => {
    const userId = await kullaniciEkle('seans@swiip.app');
    const [seans] = await ortam.db
      .insert(sessions)
      .values({ user_id: userId, gun_indeksi: 0, gun_tipi: 'upper' })
      .returning({ id: sessions.id });

    await ortam.db.insert(session_items).values({
      session_id: seans!.id,
      exercise_id: 'barbell-bench-press',
      order_index: 1,
      target_sets: 4,
      target_reps_low: 6,
      target_reps_high: 10,
      rest_seconds: 120,
      progression_rule_text: 'Dört setin dördünde de 10 tekrarı tamamlarsan 2,5 kg ekle.',
    });

    const kalemler = await ortam.db
      .select()
      .from(session_items)
      .where(eq(session_items.session_id, seans!.id));

    expect(kalemler).toHaveLength(1);
    expect(kalemler[0]!.feedback).toBeNull();
  });
});
