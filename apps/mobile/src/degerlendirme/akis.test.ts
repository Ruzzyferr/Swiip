import { describe, expect, it } from 'vitest';
import { ATLANDI, type Cevaplar } from '@swiip/core';
import {
  atlananlariIsaretle,
  blokBolumleri,
  blokHatalari,
  blokSorulari,
  gosterilecekBlokId,
} from './akis';

/**
 * Değerlendirme akışı.
 *
 * İki hata bu testlerin sebebi.
 *
 * 1. Ekranda gösterilen soru doğrudan `sonrakiSoru(cevaplar)` ile hesaplanıyordu.
 *    Kullanıcı bir şık seçer seçmez ekran kendiliğinden ilerliyor, "Devam et"e sıra
 *    hiç gelmiyordu — ve o düğme cevabı sunucuya kaydeden tek yoldu. Hiçbir cevap
 *    sunucuya yazılmıyor, blok sonu geri bildirimleri hiç görünmüyor, güvenlik
 *    kapıları sunucuda hiç değerlendirilmiyordu. Hiçbiri hata üretmiyordu.
 *
 * 2. Ekran başına tek soru vardı: 134 soru, 134 ekran, her birinin %80'i boş.
 *    Sorular artık bloklar hâlinde. Blok uydurulmuş bir gruplama değil; soru
 *    bankasının kendi yapısı.
 */

const K = { K1: '1992-03-14', K2: 'Erkek', K3: 178, K4: 92 } as Cevaplar;

describe('gosterilecekBlokId', () => {
  it('boş cevapla ilk blokta başlar', () => {
    expect(gosterilecekBlokId({}, undefined)).toBe('K');
  });

  /** Bu, ekranın kendiliğinden kaymasını engelleyen kural. */
  it('seçili blok cevap verildikçe değişmez', () => {
    expect(gosterilecekBlokId(K, 'K')).toBe('K');
  });

  it('seçili blok yoksa sıradaki cevaplanmamış sorunun bloğuna düşer', () => {
    expect(gosterilecekBlokId(K, undefined)).toBe('K');
  });

  /** Dallanma bir bloğu tamamen boşaltabiliyor; orada kilitlenmemeli. */
  it('görünür sorusu kalmayan blokta kilitlenmez', () => {
    const sonuc = gosterilecekBlokId(K, 'BOYLE_BIR_BLOK_YOK');

    expect(sonuc).toBeDefined();
    expect(sonuc).not.toBe('BOYLE_BIR_BLOK_YOK');
  });
});

describe('blokSorulari', () => {
  it('yalnızca o bloğun sorularını verir', () => {
    const sorular = blokSorulari({}, 'K');

    expect(sorular.length).toBeGreaterThan(1);
    expect(sorular.every((s) => s.blok_id === 'K')).toBe(true);
  });

  /** Tek soru/ekran düzeninde bu sayı hep 1'di; asıl değişiklik bu. */
  it('bir blokta birden çok soru aynı anda gösterilir', () => {
    expect(blokSorulari({}, 'K').length).toBeGreaterThanOrEqual(5);
  });
});

describe('blokHatalari', () => {
  it('cevaplanmamış zorunlu soru hata verir', () => {
    expect(Object.keys(blokHatalari({}, 'K')).length).toBeGreaterThan(0);
  });

  it('boş bırakılan isteğe bağlı soru ilerlemeyi engellemez', () => {
    const hatalar = blokHatalari({}, 'K');
    const istegeBagli = blokSorulari({}, 'K').filter((s) => !s.required);

    for (const soru of istegeBagli) expect(hatalar[soru.id]).toBeUndefined();
  });

  it('aralık dışı sayı hata verir', () => {
    expect(blokHatalari({ ...K, K3: 999 } as Cevaplar, 'K').K3).toBeDefined();
  });

  it('geçerli cevap hata üretmez', () => {
    expect(blokHatalari({ ...K, K3: 178 } as Cevaplar, 'K').K3).toBeUndefined();
  });
});

describe('atlananlariIsaretle', () => {
  it('boş isteğe bağlı soruları atlanmış yapar', () => {
    const sonuc = atlananlariIsaretle(K, 'K');
    const istegeBagli = blokSorulari(K, 'K').filter((s) => !s.required);

    expect(istegeBagli.length).toBeGreaterThan(0);
    for (const soru of istegeBagli) expect(sonuc[soru.id]).toBe(ATLANDI);
  });

  it('cevaplanmış soruya dokunmaz', () => {
    expect(atlananlariIsaretle(K, 'K').K1).toBe('1992-03-14');
  });

  it('zorunlu soruyu atlanmış yapmaz', () => {
    const sonuc = atlananlariIsaretle({}, 'K');
    const zorunlu = blokSorulari({}, 'K').filter((s) => s.required);

    for (const soru of zorunlu) expect(sonuc[soru.id]).not.toBe(ATLANDI);
  });
});

describe('blokBolumleri', () => {
  it('cetvel için her bloğun toplamını ve cevaplananını verir', () => {
    const bolumler = blokBolumleri(K);
    const k = bolumler.find((b) => b.id === 'K');

    expect(bolumler.length).toBeGreaterThanOrEqual(9);
    expect(k?.toplam).toBeGreaterThan(0);
    expect(k?.cevaplanan).toBe(4);
  });

  it('görünür sorusu olmayan blok cetvelde yer almaz', () => {
    expect(blokBolumleri({}).every((b) => b.toplam > 0)).toBe(true);
  });
});
