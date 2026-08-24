import { describe, expect, it } from 'vitest';
import { renkler } from './tokens';

/**
 * Mobil renk paleti kontrastı — sitede yapılanın karşılığı.
 *
 * Sitenin koyu teması ölçülüp beş kusur bulunmuştu (`scripts/site-kontrast.mjs`).
 * Mobil tarafta aynı ölçüm hiç yapılmamıştı ve aynı sınıf kusur oradaydı: birincil
 * düğme metni `'#FFFFFF'` olarak **sabit** yazılmıştı, zemini ise temaya bağlı aksan
 * rengiydi. Açık temada aksan `#14615A` (beyazla 7.27:1, sorun yok); koyu temada aksan
 * `#4FA79C`'ye açılıyor ve beyaz metin **2.86:1**'e düşüyor — AA eşiğinin çok altında.
 * Yani uygulamadaki her ana düğme koyu temada okunmuyordu.
 *
 * Test tema modülünü değil TOKENLERİ ölçüyor: tema `react-native` çekiyor, tokenler saf.
 * Zaten tek doğruluk kaynağı da burası.
 */

/** WCAG 2.1 bağıl parlaklık. */
function parlaklik(hex: string): number {
  const kanal = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * kanal[0]! + 0.7152 * kanal[1]! + 0.0722 * kanal[2]!;
}

function kontrast(a: string, b: string): number {
  const l1 = parlaklik(a);
  const l2 = parlaklik(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const AA_NORMAL = 4.5;
const AA_BUYUK = 3;

const ACIK = {
  ad: 'açık',
  zeminler: [renkler.zemin, renkler.yuzey, renkler.yuzeyIkincil],
  metinler: [renkler.murekkep, renkler.murekkepYumusak, renkler.murekkepSilik],
  aksan: renkler.aksan,
  aksanUstu: renkler.aksanUstu,
  yuzey: renkler.yuzey,
};

const KOYU = {
  ad: 'koyu',
  zeminler: [renkler.koyu.zemin, renkler.koyu.yuzey, renkler.koyu.yuzeyIkincil],
  metinler: [renkler.koyu.murekkep, renkler.koyu.murekkepYumusak, renkler.koyu.murekkepSilik],
  aksan: renkler.koyu.aksan,
  aksanUstu: renkler.koyu.aksanUstu,
  yuzey: renkler.koyu.yuzey,
};

const TEMALAR = [ACIK, KOYU];

describe('mobil palet kontrastı', () => {
  for (const t of TEMALAR) {
    it(`${t.ad} tema: gövde metinleri her zemin üstünde AA geçiyor`, () => {
      const dusukler: string[] = [];
      for (const z of t.zeminler) {
        for (const m of t.metinler) {
          const k = kontrast(m, z);
          if (k < AA_NORMAL) dusukler.push(`${m} / ${z} = ${k.toFixed(2)}`);
        }
      }
      expect(dusukler.join(' | ')).toBe('');
    });

    it(`${t.ad} tema: aksan zeminli düğme metni okunuyor`, () => {
      const k = kontrast(t.aksanUstu, t.aksan);
      expect(Number(k.toFixed(2)), `${t.aksanUstu} / ${t.aksan}`).toBeGreaterThanOrEqual(AA_BUYUK);
    });

    it(`${t.ad} tema: aksan rengi yüzey üstünde okunuyor`, () => {
      const k = kontrast(t.aksan, t.yuzey);
      expect(Number(k.toFixed(2)), `aksan/yüzey`).toBeGreaterThanOrEqual(AA_BUYUK);
    });
  }
});

/**
 * Metin DIŞI kontrast — WCAG 1.4.11.
 *
 * Metin oranları baştan beri iyiydi; kaçan şey sınırlardı. Bir metin alanının ya da
 * ikincil düğmenin çevresindeki çizgi "buraya yazılır / buraya dokunulur" bilgisinin
 * TEK taşıyıcısı ve `cizgi` bunu 1,25:1 ile yapıyordu. Düşük görmede ikincil düğme
 * bir paragraftan ayırt edilemiyordu; kullanıcı neyin dokunulabilir olduğunu göremiyor.
 *
 * `cizgi` bilerek bu testin dışında: o dekoratif bir ayraç (kart kenarı, satır arası).
 * Orada kaybolan şey bir süs, bir işlev değil. Ayrım da zaten bu yüzden yapıldı.
 */
describe('metin dışı kontrast — kontrol kenarları', () => {
  const ZEMINLER_ACIK: Array<[string, string]> = [
    ['zemin', renkler.zemin],
    ['yüzey', renkler.yuzey],
  ];
  const ZEMINLER_KOYU: Array<[string, string]> = [
    ['zemin', renkler.koyu.zemin],
    ['yüzey', renkler.koyu.yuzey],
  ];

  for (const [ad, arka] of ZEMINLER_ACIK) {
    it(`açık tema: kontrol kenarı ${ad} üstünde 3:1 geçiyor`, () => {
      expect(kontrast(renkler.kenar, arka)).toBeGreaterThanOrEqual(AA_BUYUK);
    });
  }

  for (const [ad, arka] of ZEMINLER_KOYU) {
    it(`koyu tema: kontrol kenarı ${ad} üstünde 3:1 geçiyor`, () => {
      expect(kontrast(renkler.koyu.kenar, arka)).toBeGreaterThanOrEqual(AA_BUYUK);
    });
  }

  /**
   * Uyarı metni 12 px'te kullanılıyor, yani "büyük metin" muafiyeti yok.
   * `#8A6A1F` 4,33:1 ile eşiğin hemen altındaydı ve düştüğü yer değerlendirme
   * cevaplarının kaydedilmediğini söyleyen çevrimdışı notuydu.
   */
  it('uyarı metni zemin üstünde AA geçiyor', () => {
    expect(kontrast(renkler.uyari, renkler.zemin)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(kontrast(renkler.koyu.uyari, renkler.koyu.zemin)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
