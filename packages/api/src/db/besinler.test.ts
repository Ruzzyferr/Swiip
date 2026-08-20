import { describe, expect, it } from 'vitest';
import { besinDegerleriMakulMu } from '@made2fit/core';
import { BESIN_TOHUMU, EV_OLCULERI } from './besinler';

/**
 * Besin veritabanı veri sözleşmesi (F5.6, F5.7).
 *
 * Bu tablo elle giriliyor ve büyüyor. Elle girilen sayıda tek hanelik bir hata,
 * kullanıcının günlük toplamını sessizce bozar — üstelik biz "aynı yemek her zaman aynı
 * makro" diye söz verdiğimiz için hataya güveni de yükselir.
 *
 * En güçlü koruma makro-kalori tutarlılığı: protein ve karbonhidrat 4 kcal/g, yağ 9 kcal/g.
 * Beyan edilen kalori bu hesaptan belirgin sapıyorsa satırlardan biri yanlıştır.
 */

/** Atwater katsayıları. Lif kısmen sindirildiği için ayrıca sayılmaz. */
const KCAL = { protein: 4, karbonhidrat: 4, yag: 9 };

/**
 * İzin verilen sapma.
 *
 * Gerçek bileşim tablolarında da sapma var: alkol, organik asitler, pişirme kaybı ve
 * yuvarlama. %25 ve en az 25 kcal pay, gerçek veriyi geçirip yazım hatasını yakalıyor.
 */
const SAPMA_ORANI = 0.25;
const SAPMA_TABANI = 25;

function hesaplananKalori(besin: (typeof BESIN_TOHUMU)[number]): number {
  const { protein_g, karbonhidrat_g, yag_g } = besin.per_100g;
  return protein_g * KCAL.protein + karbonhidrat_g * KCAL.karbonhidrat + yag_g * KCAL.yag;
}

describe('besin veritabanı — kimlik', () => {
  it('aynı ad iki kez geçmez', () => {
    const adlar = BESIN_TOHUMU.map((b) => b.name_tr);
    const tekrarlayan = adlar.filter((ad, i) => adlar.indexOf(ad) !== i);

    expect([...new Set(tekrarlayan)]).toEqual([]);
  });

  it('her besinin adı dolu ve makul uzunlukta', () => {
    for (const besin of BESIN_TOHUMU) {
      expect(besin.name_tr.trim().length, besin.name_tr).toBeGreaterThan(1);
      expect(besin.name_tr.length, besin.name_tr).toBeLessThanOrEqual(60);
    }
  });
});

describe('besin veritabanı — besin değeri tutarlılığı', () => {
  it('her kayıt makul aralıkta', () => {
    const makulOlmayan = BESIN_TOHUMU.filter((b) => !besinDegerleriMakulMu(b.per_100g));

    expect(makulOlmayan.map((b) => b.name_tr)).toEqual([]);
  });

  /**
   * Elle girilen tabloda en sık hata bu: bir makro yanlış yazılır, kalori eskisi kalır.
   * Makrolardan hesaplanan kalori ile beyan edilen kalori tutmuyorsa satır şüphelidir.
   */
  it('beyan edilen kalori makrolardan hesaplanana yakın', () => {
    const tutarsiz = BESIN_TOHUMU.filter((besin) => {
      const hesap = hesaplananKalori(besin);
      const pay = Math.max(SAPMA_TABANI, hesap * SAPMA_ORANI);
      return Math.abs(hesap - besin.per_100g.kalori) > pay;
    }).map((b) => ({
      ad: b.name_tr,
      beyan: b.per_100g.kalori,
      hesap: Math.round(hesaplananKalori(b)),
    }));

    expect(tutarsiz).toEqual([]);
  });

  it('lif karbonhidratı aşamaz', () => {
    const bozuk = BESIN_TOHUMU.filter((b) => b.per_100g.lif_g > b.per_100g.karbonhidrat_g + 1);

    expect(bozuk.map((b) => b.name_tr)).toEqual([]);
  });
});

describe('besin veritabanı — porsiyonlar', () => {
  it('her besinin en az bir porsiyonu var — gram tek başına kimseye bir şey ifade etmiyor', () => {
    const porsiyonsuz = BESIN_TOHUMU.filter((b) => b.portions.length === 0);

    expect(porsiyonsuz.map((b) => b.name_tr)).toEqual([]);
  });

  it('porsiyon gramları makul', () => {
    for (const besin of BESIN_TOHUMU) {
      for (const porsiyon of besin.portions) {
        expect(porsiyon.gram, `${besin.name_tr} · ${porsiyon.id}`).toBeGreaterThan(0);
        expect(porsiyon.gram, `${besin.name_tr} · ${porsiyon.id}`).toBeLessThanOrEqual(600);
      }
    }
  });

  it('bir besinde aynı porsiyon kimliği iki kez geçmez', () => {
    for (const besin of BESIN_TOHUMU) {
      const kimlikler = besin.portions.map((p) => p.id);
      expect(new Set(kimlikler).size, besin.name_tr).toBe(kimlikler.length);
    }
  });

  it('ev ölçüleri sözlüğü Türkiye’de fiilen kullanılanları kapsıyor', () => {
    for (const olcu of [
      'kase',
      'tabak',
      'kepce',
      'yemekKasigi',
      'dilim',
      'avuc',
      'adet',
      'bardak',
    ]) {
      expect(EV_OLCULERI).toHaveProperty(olcu);
    }
  });
});

describe('besin veritabanı — kapsam', () => {
  it('kaynak alanı her kayıtta dolu — atıf ve güven izlenebilir olmalı', () => {
    const gecerli = ['turkomp', 'openfoodfacts', 'bizim', 'kullanici', 'zincir'];
    const bozuk = BESIN_TOHUMU.filter((b) => !gecerli.includes(b.source));

    expect(bozuk.map((b) => b.name_tr)).toEqual([]);
  });

  it('pişmiş Türk yemeği katmanı anlamlı büyüklükte', () => {
    // Spec: bu katman farklılaşmamız değil, giriş biletimiz.
    const pismis = BESIN_TOHUMU.filter((b) => b.source === 'bizim');

    expect(pismis.length).toBeGreaterThanOrEqual(175);
  });

  it('toplam kayıt sayısı hedefe doğru ilerliyor', () => {
    expect(BESIN_TOHUMU.length).toBeGreaterThanOrEqual(360);
  });
});
