import { describe, expect, it } from 'vitest';
import { bildirimPlaniHesapla, SESSIZ_BASLANGIC, SESSIZ_BITIS } from './plan';
import type { BildirimTercihleri } from './plan';
import { en, tr } from '@swiip/shared';

/**
 * Bildirim planı (T7).
 *
 * Bildirim bir hatırlatmadır, bir dürtme değil. Bu dosyadaki testlerin yarısı
 * "şunu yapmasın" testi: seri dili yok, suçluluk yok, gece bildirim yok.
 */

const VARSAYILAN: BildirimTercihleri = {
  seans_hatirlatmasi: true,
  seans_saati: '18:00',
  geri_bildirim_hatirlatmasi: false,
  haftalik_ozet: false,
  olcum_hatirlatmasi: false,
  su_hatirlatmasi: false,
};

/** Pazartesi, Çarşamba, Cuma */
const ANTRENMAN_GUNLERI = [1, 3, 5];

const plan = (ustuneYaz: Partial<BildirimTercihleri> = {}, antrenmanGunleri = ANTRENMAN_GUNLERI) =>
  bildirimPlaniHesapla({ ...VARSAYILAN, ...ustuneYaz }, { antrenmanGunleri }, tr.bildirim);

describe('seans hatırlatması', () => {
  it('her antrenman günü için bir bildirim üretir', () => {
    const seanslar = plan().filter((b) => b.tur === 'seans');

    expect(seanslar).toHaveLength(3);
    expect(seanslar.map((b) => b.haftaGunu)).toEqual([1, 3, 5]);
  });

  it('tercih edilen saatte kurulur', () => {
    const [ilk] = plan({ seans_saati: '07:30' }).filter((b) => b.tur === 'seans');

    expect(ilk?.saat).toBe(7);
    expect(ilk?.dakika).toBe(30);
  });

  it('kapalıyken hiç seans bildirimi kurulmaz', () => {
    expect(plan({ seans_hatirlatmasi: false }).filter((b) => b.tur === 'seans')).toHaveLength(0);
  });

  it('antrenman günü yoksa seans bildirimi kurulmaz', () => {
    expect(plan({}, []).filter((b) => b.tur === 'seans')).toHaveLength(0);
  });

  it('haftalık tekrar eder', () => {
    expect(plan().every((b) => b.tekrar === 'haftalik' || b.tekrar === 'dort_haftada_bir')).toBe(
      true,
    );
  });
});

describe('geri bildirim hatırlatması', () => {
  it('seanstan sonra kurulur, seans saatinden önce değil', () => {
    const kayitlar = plan({ geri_bildirim_hatirlatmasi: true });
    const geri = kayitlar.filter((b) => b.tur === 'geri_bildirim');

    expect(geri).toHaveLength(3);
    expect(geri[0]!.saat).toBeGreaterThan(18);
  });

  it('geç saatli seansta gece yarısına taşmaz, sessiz saate çekilir', () => {
    const geri = plan({ geri_bildirim_hatirlatmasi: true, seans_saati: '21:30' }).filter(
      (b) => b.tur === 'geri_bildirim',
    );

    expect(geri[0]!.saat).toBeLessThanOrEqual(SESSIZ_BASLANGIC);
    expect(geri[0]!.haftaGunu).toBe(1);
  });

  it('seans hatırlatması kapalıyken de çalışır — geri bildirim ayrı bir tercih', () => {
    const geri = plan({ seans_hatirlatmasi: false, geri_bildirim_hatirlatmasi: true }).filter(
      (b) => b.tur === 'geri_bildirim',
    );

    expect(geri).toHaveLength(3);
  });

  it('kapalıyken kurulmaz', () => {
    expect(plan().filter((b) => b.tur === 'geri_bildirim')).toHaveLength(0);
  });
});

describe('haftalık özet', () => {
  it('haftanın son gününde, tek sefer kurulur', () => {
    const ozet = plan({ haftalik_ozet: true }).filter((b) => b.tur === 'haftalik_ozet');

    expect(ozet).toHaveLength(1);
    expect(ozet[0]!.haftaGunu).toBe(0);
  });

  it('kapalıyken kurulmaz', () => {
    expect(plan().filter((b) => b.tur === 'haftalik_ozet')).toHaveLength(0);
  });
});

describe('ölçüm hatırlatması', () => {
  it('haftalık değil, dört haftada bir kurulur', () => {
    const olcum = plan({ olcum_hatirlatmasi: true }).filter((b) => b.tur === 'olcum');

    expect(olcum).toHaveLength(1);
    expect(olcum[0]!.tekrar).toBe('dort_haftada_bir');
  });

  it('kilo değil ölçü dili kullanır — tartı baskısı kurmayız', () => {
    const [olcum] = plan({ olcum_hatirlatmasi: true }).filter((b) => b.tur === 'olcum');

    expect(olcum!.govde.toLowerCase()).not.toContain('tartıl');
  });
});

describe('su hatırlatması', () => {
  it('açıkken günde en fazla üç kez, gündüz saatlerinde kurulur', () => {
    const su = plan({ su_hatirlatmasi: true }).filter((b) => b.tur === 'su' && b.haftaGunu === 1);

    expect(su.length).toBeLessThanOrEqual(3);
    expect(su.every((b) => b.saat >= SESSIZ_BITIS && b.saat <= SESSIZ_BASLANGIC)).toBe(true);
  });

  it('varsayılan kapalıdır', () => {
    expect(plan().filter((b) => b.tur === 'su')).toHaveLength(0);
  });
});

describe('sessiz saatler', () => {
  it('hiçbir bildirim gece kurulmaz', () => {
    const hepsi = bildirimPlaniHesapla(
      {
        seans_hatirlatmasi: true,
        seans_saati: '05:00',
        geri_bildirim_hatirlatmasi: true,
        haftalik_ozet: true,
        olcum_hatirlatmasi: true,
        su_hatirlatmasi: true,
      },
      { antrenmanGunleri: [0, 1, 2, 3, 4, 5, 6] },
      tr.bildirim,
    );

    expect(hepsi.every((b) => b.saat >= SESSIZ_BITIS && b.saat <= SESSIZ_BASLANGIC)).toBe(true);
  });

  it('çok erken seans saati sessiz saatin bitişine çekilir', () => {
    const [ilk] = plan({ seans_saati: '05:00' }).filter((b) => b.tur === 'seans');

    expect(ilk!.saat).toBe(SESSIZ_BITIS);
  });
});

describe('dil kuralları — oyunlaştırma yasağı', () => {
  const YASAKLI = [
    'seri',
    'rozet',
    'elmas',
    'özledik',
    'kaçırdın',
    'tebrikler',
    'harikasın',
    'başarısız',
  ];

  it('hiçbir bildirim metninde oyunlaştırma veya suçluluk dili geçmez', () => {
    const hepsi = bildirimPlaniHesapla(
      {
        seans_hatirlatmasi: true,
        seans_saati: '18:00',
        geri_bildirim_hatirlatmasi: true,
        haftalik_ozet: true,
        olcum_hatirlatmasi: true,
        su_hatirlatmasi: true,
      },
      { antrenmanGunleri: [1, 3, 5] },
      tr.bildirim,
    );

    for (const bildirim of hepsi) {
      const metin = `${bildirim.baslik} ${bildirim.govde}`.toLocaleLowerCase('tr-TR');
      for (const yasak of YASAKLI) {
        expect(metin, `"${yasak}" geçiyor: ${metin}`).not.toContain(yasak);
      }
    }
  });

  it('her bildirimin başlığı ve gövdesi dolu', () => {
    for (const bildirim of plan({ haftalik_ozet: true, olcum_hatirlatmasi: true })) {
      expect(bildirim.baslik.length).toBeGreaterThan(0);
      expect(bildirim.govde.length).toBeGreaterThan(0);
    }
  });
});

describe('çakışma ve hacim', () => {
  it('aynı gün ve dakikada iki bildirim kurulmaz', () => {
    const hepsi = bildirimPlaniHesapla(
      {
        seans_hatirlatmasi: true,
        seans_saati: '18:00',
        geri_bildirim_hatirlatmasi: true,
        haftalik_ozet: true,
        olcum_hatirlatmasi: true,
        su_hatirlatmasi: true,
      },
      { antrenmanGunleri: [0, 1, 2, 3, 4, 5, 6] },
      tr.bildirim,
    );

    const anahtarlar = hepsi
      .filter((b) => b.tekrar === 'haftalik')
      .map((b) => `${b.haftaGunu}-${b.saat}-${b.dakika}`);

    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
  });

  it('her şey açıkken bile haftalık bildirim sayısı makul kalır', () => {
    const hepsi = bildirimPlaniHesapla(
      {
        seans_hatirlatmasi: true,
        seans_saati: '18:00',
        geri_bildirim_hatirlatmasi: true,
        haftalik_ozet: true,
        olcum_hatirlatmasi: true,
        su_hatirlatmasi: true,
      },
      { antrenmanGunleri: [1, 2, 3, 4, 5] },
      tr.bildirim,
    );

    // 5 seans + 5 geri bildirim + 1 özet + 1 ölçüm + 21 su = 33; üst sınır 40.
    expect(hepsi.length).toBeLessThanOrEqual(40);
  });

  it('aynı girdi her zaman aynı planı verir', () => {
    expect(plan({ haftalik_ozet: true })).toEqual(plan({ haftalik_ozet: true }));
  });
});

describe('geçersiz girdi', () => {
  it('bozuk saat biçimi varsayılana düşer, çökmez', () => {
    const [ilk] = plan({ seans_saati: 'abc' }).filter((b) => b.tur === 'seans');

    expect(ilk!.saat).toBe(18);
    expect(ilk!.dakika).toBe(0);
  });

  it('aralık dışı gün numarası atılır', () => {
    expect(plan({}, [1, 9, -2]).filter((b) => b.tur === 'seans')).toHaveLength(1);
  });

  it('tekrarlanan gün numarası bir kez sayılır', () => {
    expect(plan({}, [1, 1, 3]).filter((b) => b.tur === 'seans')).toHaveLength(2);
  });
});

/**
 * Bildirim metinleri iki dilde.
 *
 * Ekranlar sözlükten okuyor ve `npm run ceviri` bunu denetliyor — ama bildirimler o
 * denetimin kapsamı dışında, çünkü metin ekranda değil çekirdekte üretiliyordu. Sonuç:
 * uygulamayı İngilizce kullanan kişi Türkçe bildirim alıyordu.
 *
 * Bildirim, kullanıcının uygulamayı açmadan gördüğü tek yüzümüz. Yanlış dilde gelen bir
 * bildirim, yarı çevrilmiş bir ekrandan daha kötü görünür.
 */
describe('bildirim metinleri sözlükten geliyor', () => {
  it('Türkçe sözlükle Türkçe metin üretiyor', () => {
    const plan = bildirimPlaniHesapla(VARSAYILAN, { antrenmanGunleri: [1] }, tr.bildirim);

    expect(plan.find((b) => b.tur === 'seans')?.baslik).toBe(tr.bildirim.seans.baslik);
  });

  it('İngilizce sözlükle İngilizce metin üretiyor', () => {
    const plan = bildirimPlaniHesapla(VARSAYILAN, { antrenmanGunleri: [1] }, en.bildirim);

    expect(plan.find((b) => b.tur === 'seans')?.baslik).toBe(en.bildirim.seans.baslik);
  });

  it('hiçbir bildirimde satır içi metin kalmadı', () => {
    const plan = bildirimPlaniHesapla(
      { ...VARSAYILAN, su_hatirlatmasi: true, olcum_hatirlatmasi: true },
      { antrenmanGunleri: [1, 3, 5] },
      en.bildirim,
    );

    // Türkçe'ye özgü karakter, İngilizce sözlükle üretilen planda bulunamaz.
    for (const bildirim of plan) {
      expect(/[çğıöşüÇĞİÖŞÜ]/.test(bildirim.baslik + bildirim.govde), bildirim.tur).toBe(false);
    }
  });
});
