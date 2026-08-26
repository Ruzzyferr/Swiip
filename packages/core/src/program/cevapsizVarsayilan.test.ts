import { describe, expect, it } from 'vitest';
import { havuzHazirla } from './havuz';
import { profilDerle } from '../profil/profil';
import type { Cevaplar } from '../cevaplar';

/**
 * Cevaplanmamış soru bir BEYAN değildir.
 *
 * Bu dosyanın koruduğu kural tek cümle: sekiz kartta sorulmayan bir sorunun
 * cevapsızlığı, kullanıcının "hayır" dediği anlamına gelemez.
 *
 * İki kez aynı yerden yaralandık:
 *  - `A8` (teknik güveni) cevapsızken sabit 2.5 dönüyordu ve eşik de tam 2.5'ti;
 *    A8'i hiç görmeyen herkesin teknik tavanı 3'e düşüyordu.
 *  - `E8` (antrenman partneri) cevapsızken `?? 'Hayır'` ile "partnerim yok"a
 *    düşüyordu ve `spotter: true` olan BEŞ hareket havuzdan siliniyordu. Sonuç:
 *    normal akıştan geçen hiçbir kullanıcı barbell bench press, barbell squat ya
 *    da barbell omuz presi ALAMIYORDU. Beş yıllık, tam donanımlı salonda çalışan
 *    kullanıcının göğüs hareketi dizden şınav oluyordu.
 *
 * İkisi de "varsayılan güvenli tarafta olsun" diye yazılmıştı. Ama deneyimli bir
 * kullanıcıya yeni başlayan programı vermek güvenli değil, sadece yanlış.
 */

/** Salonda çalışan, tam donanımlı, ileri seviye kullanıcı. Keskinleştirme soruları BOŞ. */
const SALONDA_ILERI: Cevaplar = {
  K1: '1981-02-20',
  K2: 'Erkek',
  K3: 181,
  K4: 92,
  K7: 'Evet',
  K6: 'Hayır',
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
  S17: ['Hayır'],
  H1: 'Kas kazanımı',
  H10: 1,
  H6: ['gogus'],
  E1: 'Spor salonu',
  E3: [
    'Barbell ve plaka',
    'Dumbbell',
    'Düz bench',
    'Eğimli bench',
    'Squat rack',
    'Lat pulldown',
    'Kablo makinesi',
    'Leg press',
    'Barfiks barı',
  ],
  A1: '5 yıldan fazla',
  Z1: '5 gün',
  Z2: '75 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  B9: ['Yok'],
  B10: ['Yok'],
  B11: ['Yok'],
  B13: ['Yok'],
  B5: 'Kendim',
  B7: '45 dakika ve üzeri',
  B8: 'Rahat',
};

const SPOTTER_GEREKTIRENLER = [
  'barbell-bench-press',
  'barbell-squat',
  'barbell-omuz-presi',
  'egimli-barbell-press',
];

function havuzKimlikleri(cevaplar: Cevaplar): Set<string> {
  const profil = profilDerle(cevaplar, { bugun: new Date('2026-08-26'), userId: 'test' });
  return new Set(havuzHazirla(profil).havuz.map((h) => h.id));
}

describe('E8 cevapsızken spotter kısıtı', () => {
  it('salonda çalışan kullanıcıya temel barbell hareketleri VERİLİR', () => {
    const havuz = havuzKimlikleri(SALONDA_ILERI);

    for (const id of SPOTTER_GEREKTIRENLER) {
      expect(
        havuz.has(id),
        `${id} havuzda yok. E8 sorulmadı; cevapsızlık "partnerim yok" beyanına ` +
          'çevrilmiş olabilir — tam bu hata bir kez yapıldı.',
      ).toBe(true);
    }
  });

  it('evde tek başına çalışan kullanıcıda kısıt DEVAM eder', () => {
    const havuz = havuzKimlikleri({ ...SALONDA_ILERI, E1: 'Ev' });

    for (const id of SPOTTER_GEREKTIRENLER) {
      expect(havuz.has(id), `${id} evde tek başına çalışana verilmemeli`).toBe(false);
    }
  });

  it('E8 açıkça "Hayır" ise salonda bile kısıt uygulanır — beyan son sözü söyler', () => {
    const havuz = havuzKimlikleri({ ...SALONDA_ILERI, E8: 'Hayır' });

    for (const id of SPOTTER_GEREKTIRENLER) {
      expect(havuz.has(id), `${id} "partnerim yok" diyene verilmemeli`).toBe(false);
    }
  });

  it('E8 açıkça "Evet" ise evde bile kısıt kalkar', () => {
    const havuz = havuzKimlikleri({ ...SALONDA_ILERI, E1: 'Ev', E8: 'Evet, düzenli' });

    for (const id of SPOTTER_GEREKTIRENLER) {
      expect(havuz.has(id), `${id} partneri olan kullanıcıya verilmeli`).toBe(true);
    }
  });
});

describe('A8 cevapsızken teknik tavanı', () => {
  it('ileri seviyede zorluk 4 hareketler açık kalır', () => {
    const havuz = havuzKimlikleri(SALONDA_ILERI);
    expect(havuz.has('barbell-squat'), 'zorluk 4 barbell squat elenmiş').toBe(true);
    expect(havuz.has('barbell-omuz-presi'), 'zorluk 4 omuz presi elenmiş').toBe(true);
  });

  it('deadlift hiçbir VARSAYILANLA açılmaz — zorluk 5 yalnızca açık beyanla gelir', () => {
    const havuz = havuzKimlikleri(SALONDA_ILERI);
    expect(havuz.has('barbell-deadlift')).toBe(false);
  });

  it('A8 açıkça beyan edilince deadlift gelir', () => {
    const havuz = havuzKimlikleri({
      ...SALONDA_ILERI,
      A8: [
        'Barbell squat',
        'Barbell deadlift',
        'Barbell bench press',
        'Barbell omuz presi',
        'Barfiks',
      ],
    });
    expect(havuz.has('barbell-deadlift')).toBe(true);
  });
});

describe('gerekçe dili', () => {
  it('spotter gerekçesi kullanıcıya söylemediği bir şeyi söyletmez', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const kaynak = readFileSync(join(import.meta.dirname, 'program.ts'), 'utf8');

    // Yorumları at: bu test kodu sınıyor, hatanın anlatısını değil.
    const yorumsuz = kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    expect(
      yorumsuz,
      'E8 sekiz kartta sorulmuyor; "yardımcın olmadığı için" kullanıcıya yapmadığı bir beyanı atfeder.',
    ).not.toMatch(/Yardımcın olmadığı için/);
  });
});
