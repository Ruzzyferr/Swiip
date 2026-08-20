import { describe, expect, it } from 'vitest';
import { gunNumarasi, seansTarihleri, seanslariYerlestir, uygunGunler } from './takvim';

/**
 * Takvim yerleşimi (Z3 · takvim_yerlesimi, kas_grubu_dinlenme).
 *
 * Z3 "hangi günler uygun" diye sorar. Bu cevabı kullanmazsak kullanıcıya
 * çalışamayacağı bir gün için seans yazmış oluruz.
 *
 * Yerleşimin ikinci işi dinlenme: dört seansı Pazartesi–Salı–Çarşamba–Perşembe'ye
 * dizmek, aynı kas grubunu toparlanmadan tekrar yüklemek demek.
 */

describe('gunNumarasi', () => {
  it('Türkçe gün adını 0=Pazar tabanlı numaraya çevirir', () => {
    expect(gunNumarasi('Pazar')).toBe(0);
    expect(gunNumarasi('Pazartesi')).toBe(1);
    expect(gunNumarasi('Cumartesi')).toBe(6);
  });

  it('büyük-küçük harf ve boşluk farkını yutar', () => {
    expect(gunNumarasi('  çarşamba ')).toBe(3);
    expect(gunNumarasi('SALI')).toBe(2);
  });

  it('tanımadığı adı reddeder', () => {
    expect(gunNumarasi('Yortu')).toBeUndefined();
  });
});

describe('uygunGunler', () => {
  it('Z3 cevabını gün numaralarına çevirir', () => {
    expect(uygunGunler({ Z3: ['Pazartesi', 'Çarşamba', 'Cuma'] })).toEqual([1, 3, 5]);
  });

  it('sıralı döner, girdi sırası ne olursa olsun', () => {
    expect(uygunGunler({ Z3: ['Cuma', 'Pazartesi', 'Pazar'] })).toEqual([0, 1, 5]);
  });

  it('Z3 yoksa boş liste döner — varsayım üretmeyiz', () => {
    expect(uygunGunler({})).toEqual([]);
  });

  it('tanınmayan gün adlarını atar, çökmez', () => {
    expect(uygunGunler({ Z3: ['Pazartesi', 'Kutsal Gün'] })).toEqual([1]);
  });

  it('tekrarlanan günü bir kez sayar', () => {
    expect(uygunGunler({ Z3: ['Salı', 'Salı'] })).toEqual([2]);
  });
});

describe('seanslariYerlestir — uygun gün belirtilmişse', () => {
  it('uygun gün sayısı seans sayısına eşitse hepsini kullanır', () => {
    const yerlesim = seanslariYerlestir(3, [1, 3, 5]);

    expect(yerlesim.gunler).toEqual([1, 3, 5]);
    expect(yerlesim.uygunGunSayisiYetersiz).toBe(false);
  });

  it('uygun gün fazlaysa aralarını en çok açan altkümeyi seçer', () => {
    // Her gün uygun, üç seans → Pazartesi/Çarşamba/Cuma gibi bir gün arayla dağılım.
    const yerlesim = seanslariYerlestir(3, [0, 1, 2, 3, 4, 5, 6]);

    const araliklar = ardisikAraliklar(yerlesim.gunler);
    expect(Math.min(...araliklar)).toBeGreaterThanOrEqual(2);
  });

  it('üst üste iki gün seçmek zorunda değilse seçmez', () => {
    const yerlesim = seanslariYerlestir(2, [1, 2, 4]);

    expect(ardisikAraliklar(yerlesim.gunler).every((a) => a >= 2)).toBe(true);
  });

  it('uygun gün seans sayısından azsa hepsini kullanır ve bunu bildirir', () => {
    const yerlesim = seanslariYerlestir(4, [1, 3]);

    expect(yerlesim.gunler).toEqual([1, 3]);
    expect(yerlesim.uygunGunSayisiYetersiz).toBe(true);
    expect(yerlesim.gerekce).toContain('2');
  });

  it('kullanıcının uygun demediği bir güne asla seans koymaz', () => {
    const yerlesim = seanslariYerlestir(5, [1, 3, 5]);

    expect(yerlesim.gunler.every((g) => [1, 3, 5].includes(g))).toBe(true);
  });
});

describe('seanslariYerlestir — uygun gün belirtilmemişse', () => {
  it('haftaya dengeli dağıtır', () => {
    const yerlesim = seanslariYerlestir(3, []);

    expect(yerlesim.gunler).toHaveLength(3);
    expect(Math.min(...ardisikAraliklar(yerlesim.gunler))).toBeGreaterThanOrEqual(2);
  });

  it('altı seansta yalnızca bir gün boş kalır', () => {
    const yerlesim = seanslariYerlestir(6, []);

    expect(yerlesim.gunler).toHaveLength(6);
    expect(yerlesim.uygunGunSayisiYetersiz).toBe(false);
  });

  it('yedi seans istenirse haftanın tamamını verir ama dinlenme uyarısı taşır', () => {
    const yerlesim = seanslariYerlestir(7, []);

    expect(yerlesim.gunler).toHaveLength(7);
    expect(yerlesim.gerekce.toLowerCase()).toContain('dinlenme');
  });

  it('sıfır seans boş liste verir', () => {
    expect(seanslariYerlestir(0, []).gunler).toEqual([]);
  });
});

describe('seanslariYerlestir — belirlenirlik', () => {
  it('aynı girdi her zaman aynı yerleşimi verir', () => {
    expect(seanslariYerlestir(4, [1, 2, 3, 4, 5, 6])).toEqual(
      seanslariYerlestir(4, [1, 2, 3, 4, 5, 6]),
    );
  });

  it('gün listesi her zaman artan sırada döner', () => {
    const gunler = seanslariYerlestir(4, [6, 1, 4, 2]).gunler;

    expect([...gunler].sort((a, b) => a - b)).toEqual(gunler);
  });
});

describe('seansTarihleri', () => {
  it('başlangıç gününden itibaren ilk uygun tarihleri verir', () => {
    // 2026-08-17 Pazartesi.
    expect(seansTarihleri([1, 3, 5], '2026-08-17')).toEqual([
      '2026-08-17',
      '2026-08-19',
      '2026-08-21',
    ]);
  });

  it('başlangıç günü listede yoksa sonraki uygun güne atlar', () => {
    // 2026-08-18 Salı; ilk uygun gün Çarşamba.
    expect(seansTarihleri([3, 5], '2026-08-18')).toEqual(['2026-08-19', '2026-08-21']);
  });

  it('hafta sonuna sarkan günler ertesi haftaya taşar', () => {
    // 2026-08-21 Cuma; Pazartesi ertesi haftadır.
    expect(seansTarihleri([1, 5], '2026-08-21')).toEqual(['2026-08-21', '2026-08-24']);
  });

  it('tarihler artan sırada döner', () => {
    const tarihler = seansTarihleri([5, 1, 3], '2026-08-17');

    expect([...tarihler].sort()).toEqual(tarihler);
  });

  it('boş gün listesi boş tarih listesi verir', () => {
    expect(seansTarihleri([], '2026-08-17')).toEqual([]);
  });

  it('geçersiz tarih için boş liste döner, çökmez', () => {
    expect(seansTarihleri([1], 'yarın')).toEqual([]);
  });

  it('aynı girdi her zaman aynı tarihleri verir — makine saatine bakmaz', () => {
    expect(seansTarihleri([2, 4], '2026-12-31')).toEqual(seansTarihleri([2, 4], '2026-12-31'));
  });
});

/** Dairesel (hafta döngüsü) komşu gün aralıkları. */
function ardisikAraliklar(gunler: number[]): number[] {
  if (gunler.length < 2) return [7];
  return gunler.map((gun, i) => {
    const sonraki = gunler[(i + 1) % gunler.length]!;
    return i === gunler.length - 1 ? sonraki + 7 - gun : sonraki - gun;
  });
}
