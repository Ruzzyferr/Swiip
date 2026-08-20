import { describe, expect, it } from 'vitest';
import { DILLER, dilCozumle, metinleriAl, varsayilanDil } from './i18n';
import { tr } from './metinler.tr';
import { en } from './metinler.en';

/**
 * F10.1 — ikinci dil.
 *
 * Buradaki testlerin çoğu "eksik çeviri kalmasın" testi. Yarım çevrilmiş bir arayüz,
 * hiç çevrilmemiş bir arayüzden daha kötü görünür: kullanıcı hangi dilde olduğunu bilemez.
 */

/** İç içe nesnedeki tüm yaprak yolları. */
function yollar(nesne: unknown, onEk = ''): string[] {
  if (typeof nesne !== 'object' || nesne === null) return [onEk];
  return Object.entries(nesne).flatMap(([anahtar, deger]) =>
    yollar(deger, onEk ? `${onEk}.${anahtar}` : anahtar),
  );
}

function yapragaGit(nesne: unknown, yol: string): unknown {
  return yol.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], nesne);
}

describe('dil listesi', () => {
  it('Türkçe ve İngilizce tanımlı', () => {
    expect(DILLER).toEqual(['tr', 'en']);
  });

  it('varsayılan Türkçe — Türkiye önce', () => {
    expect(varsayilanDil).toBe('tr');
  });
});

describe('dilCozumle', () => {
  it('tam kodu tanır', () => {
    expect(dilCozumle('en')).toBe('en');
    expect(dilCozumle('tr')).toBe('tr');
  });

  it('bölge ekli kodu taban dile indirir', () => {
    expect(dilCozumle('en-US')).toBe('en');
    expect(dilCozumle('tr-TR')).toBe('tr');
  });

  it('Accept-Language listesinden ilk desteklenen dili seçer', () => {
    expect(dilCozumle('de-DE,de;q=0.9,en-GB;q=0.8')).toBe('en');
  });

  it('desteklenmeyen dilde varsayılana düşer', () => {
    expect(dilCozumle('de')).toBe('tr');
    expect(dilCozumle('')).toBe('tr');
    expect(dilCozumle(undefined)).toBe('tr');
  });

  it('büyük harfli kodu tanır', () => {
    expect(dilCozumle('EN')).toBe('en');
  });
});

describe('metinleriAl', () => {
  it('istenen dilin metinlerini döner', () => {
    expect(metinleriAl('tr').genel.devam).toBe('Devam');
    expect(metinleriAl('en').genel.devam).toBe('Continue');
  });

  it('fonksiyon metinleri her dilde çalışır', () => {
    expect(metinleriAl('tr').degerlendirme.ilerleme(3, 10)).toBe('3 / 10');
    expect(metinleriAl('en').odeme.kotaKalan(4, 250)).toContain('4');
  });
});

describe('çeviri bütünlüğü', () => {
  const trYollari = yollar(tr).sort();
  const enYollari = yollar(en).sort();

  it('İngilizce sözlükte eksik anahtar yok', () => {
    expect(trYollari.filter((y) => !enYollari.includes(y))).toEqual([]);
  });

  it('İngilizce sözlükte fazladan anahtar yok', () => {
    expect(enYollari.filter((y) => !trYollari.includes(y))).toEqual([]);
  });

  it('her anahtarın tipi iki dilde aynı', () => {
    for (const yol of trYollari) {
      expect(typeof yapragaGit(en, yol), yol).toBe(typeof yapragaGit(tr, yol));
    }
  });

  it('İngilizce metinlerde Türkçe karakter kalmamış', () => {
    const turkce = /[çğıöşüÇĞİÖŞÜ]/;

    for (const yol of enYollari) {
      const deger = yapragaGit(en, yol);
      if (typeof deger === 'string') expect(turkce.test(deger), `${yol}: ${deger}`).toBe(false);
    }
  });

  it('hiçbir metin boş bırakılmamış', () => {
    for (const yol of enYollari) {
      const deger = yapragaGit(en, yol);
      if (typeof deger === 'string') expect(deger.trim().length, yol).toBeGreaterThan(0);
    }
  });
});

describe('dil kuralları iki dilde de geçerli', () => {
  it('"kişiselleştirilmiş" ve karşılığı hiçbir dilde geçmez', () => {
    const trMetin = JSON.stringify(tr).toLocaleLowerCase('tr-TR');
    const enMetin = JSON.stringify(en).toLowerCase();

    expect(trMetin).not.toContain('kişiselleştirilmiş');
    expect(enMetin).not.toContain('personalized');
  });

  /**
   * Oyunlaştırma sözcükleri yalnızca olumsuzlama içinde geçebilir.
   *
   * "Rozet yok, seri yok" cümlesi ürünün duruşunu anlatıyor; sözcüğü tamamen yasaklayan
   * bir test bu cümleyi de keser ve yanlış bir kural öğretir. Kural sözcük değil, vaat.
   */
  it('oyunlaştırma sözcükleri yalnızca "yok" cümlelerinde geçer', () => {
    const kontrol = (sozluk: unknown, yasaklar: string[], olumsuz: RegExp) => {
      for (const yol of yollar(sozluk)) {
        const deger = yapragaGit(sozluk, yol);
        if (typeof deger !== 'string') continue;

        const kucuk = deger.toLowerCase();
        for (const yasak of yasaklar) {
          if (kucuk.includes(yasak)) {
            expect(olumsuz.test(kucuk), `${yol}: ${deger}`).toBe(true);
          }
        }
      }
    };

    kontrol(en, ['streak', 'badge', 'congrat', 'you crushed'], /\bno\b|\bnot\b/);
    kontrol(tr, ['rozet', 'konfeti', 'kutlama'], /yok|yapmayız|kullanılmaz/);
  });

  it('İngilizce sağlık metni de tıbbi cihaz olmadığını söyler', () => {
    expect(en.saglik.tibbiCihazDegil.toLowerCase()).toContain('not a medical device');
  });

  it('İngilizce tanı reddi hekime yönlendirir', () => {
    expect(en.koc.tanıKoymaz.toLowerCase()).toMatch(/doctor|physician/);
  });
});
