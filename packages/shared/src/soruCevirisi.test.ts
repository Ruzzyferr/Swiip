import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from './sorular.uretilmis';
import { SORU_BANKASI_EN } from './sorular.en.uretilmis';
import { blokBasligi, secenekEtiketi, soruMetni, kalemEtiketi } from './soruDili';

/**
 * Değerlendirmenin İngilizce katmanı (`data/sorular.en.json`).
 *
 * Uygulama 175 ülkede, ama kayıttan sonra ilk görülen sekiz kart yalnızca Türkçeydi.
 * Bu test iki yönü kilitliyor:
 *
 *  - EKSİK yok: bankadaki her blok, soru, seçenek ve hareket kalemi için bir etiket var.
 *    Yeni bir soru ya da seçenek eklenip çevirisi unutulursa CI kırmızı.
 *  - BAYAT yok: çeviride bankada karşılığı olmayan bir anahtar yok. Yeniden adlandırılan
 *    bir seçeneğin eski çevirisi sessizce kalmasın.
 *
 * Cevap değerleri çevrilmiyor — yalnızca ekrandaki etiket.
 */

const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;

const SORULAR = SORU_BANKASI.blocks.flatMap((b) => b.questions);
const CEVIRI = SORU_BANKASI_EN.questions;

describe('soru bankasının İngilizce katmanı', () => {
  it('her bloğun İngilizce başlığı var ve fazlası yok', () => {
    const banka = SORU_BANKASI.blocks.map((b) => b.id).sort();
    const ceviri = Object.keys(SORU_BANKASI_EN.blocks).sort();

    expect(ceviri).toEqual(banka);
    for (const id of banka) expect(SORU_BANKASI_EN.blocks[id]!.title.trim()).not.toBe('');
  });

  it('kart harfleri İngilizcede de birbirinden ayrı', () => {
    // Cetvel her kartı başlığının ilk harfiyle gösteriyor; iki "S" hangisi olduğunu söylemez.
    const harfler = SORU_BANKASI.blocks.map((b) => blokBasligi(b.id, 'en').slice(0, 1));
    expect(new Set(harfler).size).toBe(harfler.length);
  });

  it('her sorunun İngilizce metni var ve bankada olmayan soru çevrilmemiş', () => {
    const eksik = SORULAR.filter((q) => !CEVIRI[q.id]?.text?.trim()).map((q) => q.id);
    const bayat = Object.keys(CEVIRI).filter((id) => !SORULAR.some((q) => q.id === id));

    expect(eksik, 'çevrilmemiş sorular').toEqual([]);
    expect(bayat, 'bankada olmayan çeviriler').toEqual([]);
  });

  it('her seçeneğin ve hareket kaleminin etiketi var, fazlası yok', () => {
    const sorunlar: string[] = [];

    for (const soru of SORULAR) {
      for (const [alan, liste] of [
        ['options', soru.dataSource ? [] : (soru.options ?? [])],
        ['lifts', soru.lifts ?? []],
      ] as const) {
        const etiketler = CEVIRI[soru.id]?.[alan] ?? {};
        for (const deger of liste) {
          if (!etiketler[deger]?.trim()) sorunlar.push(`${soru.id} ${alan} eksik: ${deger}`);
        }
        for (const deger of Object.keys(etiketler)) {
          if (!liste.includes(deger)) sorunlar.push(`${soru.id} ${alan} bayat: ${deger}`);
        }
      }
    }

    expect(sorunlar).toEqual([]);
  });

  it('İngilizce metinlerde Türkçe harf kalmamış', () => {
    const metinler = [
      ...Object.values(SORU_BANKASI_EN.blocks).map((b) => b.title),
      ...Object.values(CEVIRI).flatMap((c) => [
        c.text,
        ...Object.values(c.options ?? {}),
        ...Object.values(c.lifts ?? {}),
      ]),
    ];

    expect(metinler.filter((m) => TURKCE_HARF.test(m))).toEqual([]);
  });
});

describe('etiket yardımcıları', () => {
  const k2 = SORULAR.find((q) => q.id === 'K2')!;

  it('Türkçede bankanın kendi metni aynen döner', () => {
    expect(soruMetni(k2, 'tr')).toBe(k2.text);
    expect(secenekEtiketi(k2, 'Kadın', 'tr')).toBe('Kadın');
    expect(blokBasligi('K', 'tr')).toBe('Sen');
  });

  it('İngilizcede etiket çevrilir, değer değişmez', () => {
    expect(soruMetni(k2, 'en')).toBe('Your biological sex');
    expect(secenekEtiketi(k2, 'Kadın', 'en')).toBe('Female');
  });

  it('tekrarlanan sorunun kalemi de çevrilir', () => {
    const s11 = SORULAR.find((q) => q.id === 'S11')!;
    const kopya = { ...s11, id: 'S11:omuz_sag', temel_id: 'S11', kalem: 'omuz_sag' };

    expect(soruMetni(kopya, 'en')).toBe('Your current pain level — Right shoulder');
    expect(secenekEtiketi({ id: 'S12:bel' }, 'Çömelme', 'en')).toBe('Squatting');
    expect(kalemEtiketi({ id: 'A5' }, 'Omuz presi', 'en')).toBe('Overhead press');
  });

  it('bilinmeyen değerde değerin kendisine düşer', () => {
    expect(secenekEtiketi(k2, 'Bilinmeyen', 'en')).toBe('Bilinmeyen');
  });
});
