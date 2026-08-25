import { describe, expect, it } from 'vitest';
import { ATLANDI, type Cevaplar } from '@swiip/core';
import { SORU_BANKASI } from '@swiip/shared';
import {
  atlananlariIsaretle,
  blokBolumleri,
  blokHatalari,
  blokSorulari,
  cevaplandiMi,
  gosterilecekBlokId,
  istegeBaglilariAtla,
  zorunlulariBitti,
  zorunluSayisi,
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
 *    Sorular artık kart kart. Kart uydurulmuş bir gruplama değil; soru bankasının
 *    kendi yapısı — sekiz kart, sekiz konu.
 */

/** Kimlik kartı tamamlanmış bir kullanıcı. */
const K = { K1: '1992-03-14', K2: 'Erkek', K3: 178, K4: 92 } as Cevaplar;

/** Kimlik kartı YARIM: sıradaki cevaplanmamış soru hâlâ K bloğunda. */
const YARIM_K = { K1: '1992-03-14', K2: 'Erkek' } as Cevaplar;

describe('gosterilecekBlokId', () => {
  it('boş cevapla ilk blokta başlar', () => {
    expect(gosterilecekBlokId({}, undefined)).toBe('K');
  });

  /** Bu, ekranın kendiliğinden kaymasını engelleyen kural. */
  it('seçili blok cevap verildikçe değişmez', () => {
    expect(gosterilecekBlokId(K, 'K')).toBe('K');
  });

  it('seçili blok yoksa sıradaki cevaplanmamış sorunun bloğuna düşer', () => {
    expect(gosterilecekBlokId(YARIM_K, undefined)).toBe('K');
    // Kart tamamlanınca bir sonraki karta geçer.
    expect(gosterilecekBlokId(K, undefined)).toBe('G');
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
  it('bir kartta birden çok soru aynı anda gösterilir', () => {
    expect(blokSorulari({}, 'K').length).toBeGreaterThanOrEqual(4);
    expect(blokSorulari({}, 'G').length).toBeGreaterThanOrEqual(6);
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

/**
 * Bölüm notundaki sayı ile doğrulamanın engellediği soru sayısı AYNI olmalı.
 *
 * Bir kez ayrıştılar: arayüz notu `soru.optional` bayrağıyla çiziyordu ve o bayrak soru
 * bankasında yalnızca 12 soruda vardı; doğrulama ise `required` bakıyordu. Kalan 98
 * soru hiçbir işaret taşımadan zorunlu görünüyor, kullanıcı 136 sorunun hepsini
 * cevaplamak zorunda sanıyordu. Bu test o ayrışmayı bir daha derlemeden geçirmez.
 */
describe('zorunluSayisi', () => {
  it('boş cevapta blokHatalari ile aynı sayıyı verir', () => {
    for (const blok of ['K', 'H', 'A', 'S', 'E', 'Z', 'Y', 'B', 'T', 'F']) {
      expect(zorunluSayisi({}, blok)).toBe(Object.keys(blokHatalari({}, blok)).length);
    }
  });

  it('zorunlu soru bloğun küçük bir azınlığı', () => {
    expect(zorunluSayisi({}, 'B')).toBeLessThan(blokSorulari({}, 'B').length / 2);
  });

  it('soru bankasında artık optional bayrağı yok — tek doğruluk kaynağı required', () => {
    const hepsi = SORU_BANKASI.blocks.flatMap((b) => b.questions);

    expect(hepsi.length).toBeGreaterThan(30);
    for (const soru of hepsi) expect(soru).not.toHaveProperty('optional');
  });
});

/**
 * "İsteğe bağlı soruları sonra cevaplayacağım".
 *
 * Değeri olan tek davranış: angaryanın TAMAMINI bitirmek. Yalnızca açık bloğu atlasaydı
 * "Devam et"in aynısı olurdu ve düğmeye değmezdi. Ama zorunlu soruyu atlatmamalı — dört
 * güvenlik kapısı (18 yaş, gebelik, kardiyak, yeme bozukluğu) oradan geçiyor.
 */
describe('istegeBaglilariAtla', () => {
  it('bütün kartların isteğe bağlı sorularını atlanmış yapar', () => {
    const sonuc = istegeBaglilariAtla(K);
    let sayac = 0;

    for (const blok of SORU_BANKASI.blocks)
      for (const soru of blokSorulari(K, blok.id)) {
        if (soru.required) continue;
        if (K[soru.id] !== undefined) continue;
        expect(sonuc[soru.id]).toBe(ATLANDI);
        sayac += 1;
      }

    expect(sayac).toBeGreaterThan(5);
  });

  it('zorunlu soruya dokunmaz — kapılar bir dokunuşla aşılamaz', () => {
    const sonuc = istegeBaglilariAtla({});

    for (const soru of blokSorulari({}, 'K').filter((s) => s.required))
      expect(sonuc[soru.id]).toBeUndefined();
  });

  it('cevaplanmış soruyu ezmez', () => {
    expect(istegeBaglilariAtla(K).K1).toBe('1992-03-14');
  });

  /** Atlandıktan sonra geriye YALNIZCA zorunlu sorular kalır. */
  it('kalan tek iş zorunlu sorulardır', () => {
    const sonuc = istegeBaglilariAtla(K);
    const kalan = ['K', 'H', 'A', 'S', 'E', 'Z', 'Y', 'B', 'T', 'F'].flatMap((blok) =>
      blokSorulari(sonuc, blok).filter((soru) => !cevaplandiMi(sonuc, soru)),
    );

    expect(kalan.length).toBeGreaterThan(0);
    expect(kalan.every((soru) => soru.required)).toBe(true);
  });
});

describe('zorunlulariBitti', () => {
  it('boş cevapta false', () => {
    expect(zorunlulariBitti({}, 'K')).toBe(false);
  });

  it('bloğun zorunluları dolunca true', () => {
    const dolu = { ...K, K6: 'Hayır', K7: 'Evet' } as Cevaplar;

    expect(zorunlulariBitti(dolu, 'K')).toBe(true);
  });

  /** Zorunlusu olmayan blok baştan geçilebilir. */
  it('zorunlusu olmayan blokta true', () => {
    expect(zorunlulariBitti({}, 'T')).toBe(true);
  });
});

describe('atlananlariIsaretle', () => {
  it('boş isteğe bağlı soruları atlanmış yapar', () => {
    // Kimlik kartının dördü de zorunlu; isteğe bağlı soru Beslenme kartında.
    const sonuc = atlananlariIsaretle(K, 'B');
    const istegeBagli = blokSorulari(K, 'B').filter((s) => !s.required);

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

    expect(bolumler.length).toBeGreaterThanOrEqual(8);
    expect(k?.toplam).toBeGreaterThan(0);
    expect(k?.cevaplanan).toBe(4);
  });

  it('görünür sorusu olmayan blok cetvelde yer almaz', () => {
    expect(blokBolumleri({}).every((b) => b.toplam > 0)).toBe(true);
  });
});
