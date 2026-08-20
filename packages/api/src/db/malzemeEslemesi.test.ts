import { describe, expect, it } from 'vitest';
import { BESIN_TOHUMU } from './besinler';
import { TARIF_TOHUMU } from './tarifler';
import { besinAra, MALZEME_ESLEMESI, tarifMakrolariniHesapla } from './malzemeEslemesi';

/**
 * Malzeme çözümleme ve tarif makrosu türetme (F5.6, F8.2).
 *
 * Ürünün sözü: "besin değeri veritabanından gelir, biz uydurmayız." Tarif makrolarının
 * elle yazılmış sayılar olması bu sözü tam tutmuyordu. Burası onu kapatıyor: malzemeler
 * besin tablosuna çözülüyor ve makro oradan hesaplanıyor.
 *
 * Toplamlar pişirme veriminden bağımsız: bir tarifin toplam enerjisi malzemelerinin
 * toplamıdır, tencerede ne kadar su kaybettiğinden etkilenmez. Yüz gram başına değer
 * verimden etkilenir, ama tarif kartında gösterdiğimiz şey toplam.
 */

describe('besinAra', () => {
  it('birebir adı bulur', () => {
    expect(besinAra('Zeytinyağı')?.kalori).toBe(884);
  });

  it('büyük-küçük harf farkını yutar', () => {
    expect(besinAra('zeytinyağı')).toEqual(besinAra('Zeytinyağı'));
  });

  it('eşleme sözlüğü üzerinden çözer', () => {
    // Tarifte "tavuk göğsü" yazar; tabloda "Tavuk göğsü, pişmiş".
    expect(besinAra('tavuk göğsü')?.protein_g).toBeGreaterThan(25);
  });

  it('bilinmeyen malzeme için undefined döner', () => {
    expect(besinAra('ejderha meyvesi')).toBeUndefined();
  });
});

describe('MALZEME_ESLEMESI', () => {
  it('her eşleme hedefi besin tablosunda gerçekten var', () => {
    const adlar = new Set(BESIN_TOHUMU.map((b) => b.name_tr.toLocaleLowerCase('tr-TR')));
    const kirik = Object.entries(MALZEME_ESLEMESI).filter(([, hedef]) => !adlar.has(hedef));

    expect(kirik).toEqual([]);
  });

  /**
   * Çiğ/pişmiş karışıklığı bu veri modelinin en sinsi hatası: 80 g makarna kuru mu
   * haşlanmış mı, iki buçuk kat fark eder. Eşleme hedefi belirsizse hata kaçınılmaz.
   */
  it('çiğ ölçülen malzemeler çiğ karşılığa eşleniyor', () => {
    for (const malzeme of ['pirinç', 'bulgur', 'makarna', 'kuskus', 'mantı', 'nohut']) {
      const hedef = MALZEME_ESLEMESI[malzeme];
      expect(hedef, malzeme).toBeDefined();
      expect(hedef, malzeme).toMatch(/çiğ|kuru/);
    }
  });
});

describe('tarifMakrolariniHesapla', () => {
  it('çözülebilen tarif için makro üretir', () => {
    const menemen = TARIF_TOHUMU.find((t) => t.id === 'menemen')!;

    const hesap = tarifMakrolariniHesapla(menemen);

    expect(hesap).not.toBeNull();
    expect(hesap!.kalori).toBeGreaterThan(0);
    expect(hesap!.protein_g).toBeGreaterThan(0);
  });

  it('toplam enerji malzemelerin toplamıdır — pişirme verimi etkilemez', () => {
    const tarif = {
      ...TARIF_TOHUMU[0]!,
      malzemeler: [
        { ad: 'zeytinyağı', gram: 10, reyon: 'kuru_gida' as const },
        { ad: 'yumurta', gram: 100, reyon: 'sarkuteri' as const },
      ],
    };

    const hesap = tarifMakrolariniHesapla(tarif)!;
    const zeytinyagi = besinAra('zeytinyağı')!;
    const yumurta = besinAra('yumurta')!;

    expect(hesap.kalori).toBe(Math.round(zeytinyagi.kalori * 0.1 + yumurta.kalori));
  });

  it('malzemesi çözülemeyen tarif için null döner — yarım hesap yapmayız', () => {
    const tarif = {
      ...TARIF_TOHUMU[0]!,
      malzemeler: [{ ad: 'ejderha meyvesi', gram: 100, reyon: 'manav' as const }],
    };

    expect(tarifMakrolariniHesapla(tarif)).toBeNull();
  });

  it('aynı tarif her zaman aynı makroyu verir', () => {
    const tarif = TARIF_TOHUMU.find((t) => t.id === 'menemen')!;

    expect(tarifMakrolariniHesapla(tarif)).toEqual(tarifMakrolariniHesapla(tarif));
  });
});

describe('kütüphane kapsamı', () => {
  const cozulen = TARIF_TOHUMU.filter((t) => tarifMakrolariniHesapla(t) !== null);

  it('tariflerin çoğunun makrosu veritabanından türetilebiliyor', () => {
    expect(cozulen.length / TARIF_TOHUMU.length).toBeGreaterThanOrEqual(0.6);
  });

  /**
   * Elle yazılmış değer türetilenden belirgin sapıyorsa biri yanlıştır. Tohumlamada
   * türetilen kazanır; bu test sapmanın gözden kaçmamasını sağlar.
   */
  it('elle yazılmış makro türetilenle uyumlu', () => {
    const sapanlar = cozulen
      .map((tarif) => ({ tarif, hesap: tarifMakrolariniHesapla(tarif)! }))
      .filter(({ tarif, hesap }) => {
        const oran = hesap.kalori / Math.max(1, tarif.makrolar.kalori);
        return oran > 1.35 || oran < 0.7;
      })
      .map(({ tarif, hesap }) => ({
        id: tarif.id,
        yazilan: tarif.makrolar.kalori,
        turetilen: hesap.kalori,
      }));

    expect(sapanlar).toEqual([]);
  });
});
